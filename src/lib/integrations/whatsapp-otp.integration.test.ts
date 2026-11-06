// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Pool,PoolClient} from 'pg';
import {clientFingerprint,protectClientValue} from '@/lib/clients/privacy';
import {generateWhatsappOtp,normalizeWhatsappOtp} from './whatsapp-otp-code';
const sender=vi.hoisted(()=>vi.fn());
vi.mock('./whatsapp-otp-provider',()=>({sendWhatsappOtpMessage:sender}));
const db=new PGlite();const query=async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return{...r,rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows??r.rows.length};};
const conn={query,release(){}} as unknown as PoolClient;const pool={query,connect:async()=>conn} as unknown as Pool;
vi.mock('@/lib/clients/db',async original=>({...await original<typeof import('@/lib/clients/db')>(),clientPool:()=>pool}));
import {sendWhatsappOtp,confirmWhatsappOtp,whatsappOtpStatus} from './whatsapp-otp';
const phone='+56912345678';
async function user(id:string,number=phone){await query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,'Test',$2,'Cliente','Prueba','unused',$1,$3)`,[id,id+'@example.invalid',protectClientValue(number,'whatsapp')]);}
async function issue(){const result=await sendWhatsappOtp('owner','192.0.2.1');return{requestId:result.requestId!,code:sender.mock.lastCall![1] as string};}
async function cooldown(){await query("UPDATE oc_client_whatsapp_otps SET resend_at=now()-interval '1 second'");}
const row=async()=>(await query('SELECT * FROM oc_client_whatsapp_otps WHERE user_id=$1',['owner'])).rows[0];
const verified=async()=>(await query('SELECT "whatsappVerified" FROM oc_client_user WHERE id=$1',['owner'])).rows[0].whatsappVerified;
beforeAll(async()=>{
 vi.stubEnv('CLIENT_DATABASE_SCHEMA','public');vi.stubEnv('CLIENT_DATA_KEY',randomBytes(32).toString('base64'));
 vi.stubEnv('WHATSAPP_OTP_ENABLED','true');vi.stubEnv('KAPSO_API_KEY','synthetic-key');vi.stubEnv('KAPSO_PHONE_NUMBER_ID','1368248166370894');vi.stubEnv('KAPSO_OTP_TEMPLATE_NAME','oc_verificacion_whatsapp_v1');vi.stubEnv('KAPSO_OTP_TEMPLATE_LANGUAGE','es_CL');
 await db.exec(await readFile('sql/clients/001-customers.sql','utf8'));await db.exec(await readFile('sql/integrations/002-whatsapp-verification.sql','utf8'));
 const migration=await readFile('sql/integrations/004-whatsapp-otp.sql','utf8');await db.exec(migration);await db.exec(migration);
},30000);
beforeEach(async()=>{await db.exec('DELETE FROM oc_client_user;DELETE FROM oc_client_registration_limit;');await user('owner');sender.mockReset().mockResolvedValue({accepted:true,id:'wamid.synthetic',uncertain:false});});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
it('genera cuatro caracteres con letras y números; normaliza ASCII sin distinguir mayúsculas',()=>{
 for(let i=0;i<1000;i++){const code=generateWhatsappOtp();expect(code).toMatch(/^[A-Z2-9]{4}$/);expect(code).toMatch(/[A-Z]/);expect(code).toMatch(/[2-9]/);expect(normalizeWhatsappOtp(code.toLowerCase())).toBe(code);}
 for(const bad of ['ß2A','Ａ7K2','A7K22',1234,null,'A 2K'])expect(normalizeWhatsappOtp(bad)).toBeNull();
});
it('envía al número registrado, nunca devuelve ni almacena el código plano y restaura el formulario',async()=>{
 const input=await issue();expect(sender).toHaveBeenCalledWith(phone,input.code);expect(await verified()).toBe(false);
 const saved=await row();expect(saved.code_hash).not.toBe(input.code);expect(saved.code_hash).toMatch(/^[a-f0-9]{64}$/);expect(saved.state).toBe('sent');
 const status=await whatsappOtpStatus('owner');expect(status.pending?.requestId).toBe(input.requestId);expect(JSON.stringify(status)).not.toContain(input.code);expect(JSON.stringify(status)).not.toContain(phone);
});
it('valida en minúsculas una sola vez y permite repetir la confirmación sin duplicar auditoría',async()=>{
 const input=await issue();expect(await confirmWhatsappOtp('owner',{...input,code:input.code.toLowerCase()},'192.0.2.1')).toEqual({verified:true});
 expect(await verified()).toBe(true);expect((await row()).code_hash).toBeNull();expect((await row()).consumed_at).not.toBeNull();
 await confirmWhatsappOtp('owner',input,'192.0.2.1');expect((await query('SELECT * FROM oc_client_whatsapp_receipts')).rows).toHaveLength(1);
 expect((await whatsappOtpStatus('owner')).pending).toBeNull();
});
it('persiste cinco fallos y bloquea también el código correcto después del quinto',async()=>{
 const input=await issue();const wrong=input.code==='A2B3'?'B3C4':'A2B3';
 for(let i=0;i<5;i++)await expect(confirmWhatsappOtp('owner',{...input,code:wrong},'192.0.2.1')).rejects.toMatchObject({status:400});
 expect((await row()).attempts).toBe(5);expect((await row()).code_hash).toBeNull();await expect(confirmWhatsappOtp('owner',input,'192.0.2.1')).rejects.toMatchObject({status:400});expect(await verified()).toBe(false);
});
it('rechaza códigos vencidos y no extiende su vigencia al consultar',async()=>{
 const input=await issue();await query("UPDATE oc_client_whatsapp_otps SET expires_at=now()-interval '1 second'");
 expect((await whatsappOtpStatus('owner')).pending).toBeNull();await expect(confirmWhatsappOtp('owner',input,'192.0.2.1')).rejects.toMatchObject({status:400});expect(await verified()).toBe(false);
});
it('un reenvío invalida la solicitud anterior y respeta el minuto de espera',async()=>{
 const input=await issue();await expect(sendWhatsappOtp('owner','192.0.2.2')).rejects.toMatchObject({status:429});expect(sender).toHaveBeenCalledTimes(1);
 await cooldown();const next=await issue();expect(next.requestId).not.toBe(input.requestId);await expect(confirmWhatsappOtp('owner',input,'192.0.2.1')).rejects.toMatchObject({status:400});await confirmWhatsappOtp('owner',next,'192.0.2.1');
});
it('no permite validar una solicitud de otra cuenta ni enviar una identidad por el cuerpo',async()=>{
 const input=await issue();await user('other','+56911112222');await expect(confirmWhatsappOtp('other',input,'192.0.2.2')).rejects.toMatchObject({status:400});
 await expect(confirmWhatsappOtp('owner',{...input,userId:'other'},'192.0.2.1')).rejects.toMatchObject({status:400});expect(await verified()).toBe(false);
});
it('cambiar el teléfono cancela el código y revoca una verificación previa',async()=>{
 const input=await issue();await query('UPDATE oc_client_user SET "whatsappCipher"=$1 WHERE id=$2',[protectClientValue('+56911112222','whatsapp'),'owner']);
 expect((await row()).cancelled_at).not.toBeNull();expect((await row()).code_hash).toBeNull();await expect(confirmWhatsappOtp('owner',input,'192.0.2.1')).rejects.toMatchObject({status:400});
 await query('UPDATE oc_client_user SET "whatsappVerified"=true WHERE id=$1',['owner']);await query('UPDATE oc_client_user SET "whatsappCipher"=$1 WHERE id=$2',[protectClientValue(phone,'whatsapp'),'owner']);expect(await verified()).toBe(false);
});
it.each([false,true])('un fallo de proveedor (incierto=%s) consume límite sin validar ni reintentar',async uncertain=>{
 sender.mockResolvedValue({accepted:false,id:null,uncertain});await expect(sendWhatsappOtp('owner','192.0.2.1')).rejects.toMatchObject({status:503,retryAfterSeconds:60});
 expect(sender).toHaveBeenCalledTimes(1);expect(await verified()).toBe(false);expect((await row()).code_hash).toBeNull();expect((await row()).state).toBe(uncertain?'uncertain':'failed');
 await expect(sendWhatsappOtp('owner','192.0.2.1')).rejects.toMatchObject({status:429});expect((await whatsappOtpStatus('owner')).pending).toBeNull();
});
it('un timeout no reintenta automáticamente y no revierte la reserva de envío',async()=>{sender.mockRejectedValue(Error('synthetic timeout'));await expect(issue()).rejects.toMatchObject({status:503});expect((await row()).state).toBe('uncertain');expect(sender).toHaveBeenCalledTimes(1);});
it('un cambio de teléfono mientras se envía impide publicar o confirmar el código',async()=>{
 sender.mockImplementationOnce(async()=>{await query('UPDATE oc_client_user SET "whatsappCipher"=$1 WHERE id=$2',[protectClientValue('+56911112222','whatsapp'),'owner']);return{accepted:true,id:'wamid.synthetic',uncertain:false};});
 await expect(issue()).rejects.toMatchObject({status:503});expect(await verified()).toBe(false);expect((await whatsappOtpStatus('owner')).pending).toBeNull();
});
it('falla cerrado cuando no está configurado y no genera ni envía códigos',async()=>{
 vi.stubEnv('WHATSAPP_OTP_ENABLED','false');try{expect((await whatsappOtpStatus('owner')).available).toBe(false);await expect(issue()).rejects.toMatchObject({status:503});expect(sender).not.toHaveBeenCalled();}finally{vi.stubEnv('WHATSAPP_OTP_ENABLED','true');}
});
it('no envía otro código a un teléfono ya verificado',async()=>{await query('UPDATE oc_client_user SET "whatsappVerified"=true WHERE id=$1',['owner']);expect(await sendWhatsappOtp('owner','192.0.2.1')).toEqual({verified:true});expect(sender).not.toHaveBeenCalled();});
it('aplica el límite horario al código nuevo aunque cambie la IP',async()=>{
 for(let i=0;i<3;i++){await sendWhatsappOtp('owner','192.0.2.'+i);await cooldown();}
 await expect(sendWhatsappOtp('owner','198.51.100.1')).rejects.toMatchObject({status:429});expect(sender).toHaveBeenCalledTimes(3);
});
it('el teléfono compartido entre cuentas conserva el límite de emisión',async()=>{
 for(let i=0;i<3;i++){await user('shared'+i);await sendWhatsappOtp('shared'+i,'192.0.2.'+i);}
 await expect(issue()).rejects.toMatchObject({status:429});expect(sender).toHaveBeenCalledTimes(3);
});
it('el límite global corta antes de llamar al proveedor',async()=>{await query("INSERT INTO oc_client_registration_limit(key,count,reset_at) VALUES($1,120,now()+interval '1 hour')",[clientFingerprint('all','wa-verification:issue-global-hour')]);await expect(issue()).rejects.toMatchObject({status:429});expect(sender).not.toHaveBeenCalled();});
it('limita intentos de confirmación inválidos incluso si se rota la solicitud',async()=>{
 for(let i=0;i<15;i++)await expect(confirmWhatsappOtp('owner',{requestId:randomUUID(),code:'A2B3'},'192.0.2.'+i)).rejects.toMatchObject({status:400});
 await expect(confirmWhatsappOtp('owner',{requestId:randomUUID(),code:'A2B3'},'198.51.100.1')).rejects.toMatchObject({status:429});
});
