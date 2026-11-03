// @vitest-environment node
import {afterAll,beforeAll,beforeEach,describe,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
const state=vi.hoisted(()=>({pool:null as unknown,realSend:vi.fn()}));
vi.mock('./db',()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock('@/lib/mail/resend',()=>({enviarConResend:state.realSend}));
import {changeCustomerCategory,getCategorySettings} from './categories';
import {drainLevelUpgradeMail} from './level-mail';
import {revealClientValue} from './privacy';
const db=new PGlite(),conn={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return{...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
const request=(category='premium',expectedCategory='start')=>({category,expectedCategory,requestKey:randomUUID()});
const transport=()=>vi.fn().mockResolvedValue({ok:true,id:'simulated-provider-id',error:null});
async function queue(){return (await db.query<{id:string;state:string;payload_cipher:string;attempts:number;failure_code:string}>('SELECT * FROM oc_client_level_mail ORDER BY created_at,id')).rows;}
beforeAll(()=>{vi.stubEnv('CLIENT_DATA_KEY',randomBytes(32).toString('base64'));vi.stubEnv('CLIENT_LEVEL_MAIL_ENABLED','true');vi.stubEnv('NODE_ENV','development');});
beforeEach(async()=>{
 await db.exec('DROP SCHEMA IF EXISTS level_mail_test CASCADE; CREATE SCHEMA level_mail_test; SET search_path TO level_mail_test;');
 for(const file of ['001-customers.sql','002-sales.sql','006-categories.sql','007-installments.sql','018-level-upgrade-mail.sql'])await db.exec(await readFile('sql/clients/'+file,'utf8'));
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES('qa','Persona de prueba','qa@example.invalid','Persona','Prueba','synthetic','qa','synthetic',true)`);
 state.realSend.mockReset();
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential('Ascensos y felicitaciones sin correos reales',()=>{
 it('guarda ascenso manual, usuario y felicitación cifrada en una transacción; reintenta sin duplicados',async()=>{
  const input=request();await changeCustomerCategory('qa',input,'responsable');await changeCustomerCategory('qa',input,'responsable');
  const jobs=await queue();expect(jobs).toHaveLength(1);expect(jobs[0].state).toBe('pending');expect(jobs[0].payload_cipher).not.toContain('example.invalid');
  const payload=JSON.parse(revealClientValue(jobs[0].payload_cipher,'level-email'));expect(payload).toMatchObject({to:'qa@example.invalid',tier:{code:'premium',maxAmount:80000,maxPercent:60,maxInstallments:3},available:80000});
  expect((await getCategorySettings('qa')).history[0]).toMatchObject({actor:'responsable',source:'manual',mailState:'pending'});
 });
 it('el mismo servicio prepara correo para un ascenso automático sin activar reglas automáticas',async()=>{
  await changeCustomerCategory('qa',request(),'sistema-prueba',{source:'automatic'});
  expect((await getCategorySettings('qa')).history[0]).toMatchObject({source:'automatic'});expect(await queue()).toHaveLength(1);
 });
 it('un cambio sin efecto o un descenso no genera felicitaciones',async()=>{
  await changeCustomerCategory('qa',request('start'),'responsable');expect(await queue()).toHaveLength(0);
  await db.query("UPDATE oc_client_user SET category='elite' WHERE id='qa'");
  await changeCustomerCategory('qa',request('vip','elite'),'responsable');expect(await queue()).toHaveLength(0);
 });
 it('un fallo al preparar el correo revierte nivel e historial',async()=>{
  await db.exec("CREATE FUNCTION fail_mail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'queue failure'; END $$; CREATE TRIGGER fail_mail BEFORE INSERT ON oc_client_level_mail FOR EACH ROW EXECUTE FUNCTION fail_mail();");
  await expect(changeCustomerCategory('qa',request(),'responsable')).rejects.toThrow();expect((await getCategorySettings('qa')).currentCategory).toBe('start');expect((await getCategorySettings('qa')).history).toEqual([]);
 });
 it('desarrollo jamás usa el transporte real, aunque se habilite la variable de envío',async()=>{
  await changeCustomerCategory('qa',request(),'responsable');expect(await drainLevelUpgradeMail()).toMatchObject({disabled:true,accepted:0});expect(state.realSend).not.toHaveBeenCalled();expect((await queue())[0].attempts).toBe(0);
 });
 it('envía la felicitación con porcentaje, tope y ejemplo correctos y no vuelve a enviar un correo aceptado',async()=>{
  await changeCustomerCategory('qa',request(),'responsable');const send=transport();expect(await drainLevelUpgradeMail({}, {transport:send})).toEqual({accepted:1});expect(await drainLevelUpgradeMail({}, {transport:send})).toEqual({accepted:0});expect(send).toHaveBeenCalledOnce();
  const mail=send.mock.calls[0][0];expect(mail.to).toBe('qa@example.invalid');for(const value of ['60%','$80.000','$48.000','$32.000','pie'])expect(mail.text).toContain(value);expect((await queue())[0].state).toBe('accepted');
 });
 it('no promete cupo utilizable si queda crédito pendiente',async()=>{
  await db.query("UPDATE oc_client_credit_balances SET principal_outstanding=10000 WHERE user_id='qa'");await changeCustomerCategory('qa',request(),'responsable');const send=transport();await drainLevelUpgradeMail({}, {transport:send});
  expect(send.mock.calls[0][0].text).toContain('Disponible para utilizar al preparar este correo: $0');expect(send.mock.calls[0][0].text).toContain('cuando pagues el saldo pendiente');expect((await db.query<{principal_outstanding:number}>("SELECT principal_outstanding FROM oc_client_credit_balances WHERE user_id='qa'")).rows[0].principal_outstanding).toBe(10000);
 });
 it('espera la verificación del correo y consulta el cupo vigente antes del primer envío',async()=>{
  await db.query('UPDATE oc_client_user SET "emailVerified"=false WHERE id=\'qa\'');await changeCustomerCategory('qa',request(),'responsable');const send=transport();await drainLevelUpgradeMail({}, {transport:send});expect(send).not.toHaveBeenCalled();
  await db.query('UPDATE oc_client_user SET "emailVerified"=true WHERE id=\'qa\'');await drainLevelUpgradeMail({}, {transport:send});expect(send).toHaveBeenCalledOnce();expect(send.mock.calls[0][0].text).toContain('Disponible para utilizar al preparar este correo: $80.000');
 });
 it.each(['email','category'])('cancela un correo cuando cambia %s para evitar destinatarios o niveles obsoletos',async field=>{
  await changeCustomerCategory('qa',request(),'responsable');await db.query(field==='email'?"UPDATE oc_client_user SET email='other@example.invalid' WHERE id='qa'":"UPDATE oc_client_user SET category='vip' WHERE id='qa'");const send=transport();await drainLevelUpgradeMail({}, {transport:send});expect(send).not.toHaveBeenCalled();expect((await queue())[0].state).toBe('cancelled');
 });
 it('los reintentos conservan cuerpo y clave; un rechazo permanente requiere revisión',async()=>{
  await changeCustomerCategory('qa',request(),'responsable');const send=vi.fn().mockResolvedValueOnce({ok:false,id:null,error:'uncertain'}).mockResolvedValueOnce({ok:true,id:'fake-provider',error:null});
  await drainLevelUpgradeMail({}, {transport:send});expect((await queue())[0].state).toBe('pending');await db.exec("UPDATE oc_client_level_mail SET next_attempt_at=now();UPDATE oc_client_user SET \"firstName\"='Otro nombre' WHERE id='qa';");await drainLevelUpgradeMail({}, {transport:send});
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);expect((await queue())[0].state).toBe('accepted');
 });
 it('no reintenta envíos inciertos fuera de la ventana de idempotencia',async()=>{
  await changeCustomerCategory('qa',request(),'responsable');await db.exec("UPDATE oc_client_level_mail SET attempts=1,first_attempt_at=now()-interval '24 hours'");const send=transport();await drainLevelUpgradeMail({}, {transport:send});expect(send).not.toHaveBeenCalled();expect((await queue())[0].state).toBe('review');
 });
 it('un rechazo del proveedor no se muestra como correo entregado',async()=>{
  await changeCustomerCategory('qa',request(),'responsable');const send=vi.fn().mockResolvedValue({ok:false,id:null,error:'invalid',httpStatus:422});await drainLevelUpgradeMail({}, {transport:send});expect((await queue())[0].state).toBe('failed');
 });
});
