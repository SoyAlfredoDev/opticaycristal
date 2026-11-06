// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {randomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";
import type {Pool,PoolClient} from "pg";
import {clientFingerprint,protectClientValue} from "@/lib/clients/privacy";
import {createWhatsappChallenge,acceptKapsoVerification} from "./kapso-verification";
import {whatsappRequestIp,limitWhatsappStatus,allowWhatsappReceipt} from "./whatsapp-verification-limits";
const db=new PGlite();const query=async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return{...r,rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows??r.rows.length};};
const conn={query,release(){}} as unknown as PoolClient;const pool={query,connect:async()=>conn} as unknown as Pool;
vi.mock("@/lib/clients/db",async original=>({...await original<typeof import("@/lib/clients/db")>(),clientPool:()=>pool}));
const phone="+56912345678";
async function user(id:string,number=phone){await query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,'Test',$2,'Cliente','Prueba','unused',$1,$3)`,[id,id+'@example.invalid',protectClientValue(number,"whatsapp")]);}
async function cooldown(){await query("UPDATE oc_client_whatsapp_challenges SET issued_at=now()-interval '2 minutes'");}
async function resetCounter(purpose:string,value:string){await query('UPDATE oc_client_registration_limit SET reset_at=now()-interval \'1 second\' WHERE key=$1',[clientFingerprint(value,'wa-verification:'+purpose)]);}
beforeAll(async()=>{vi.stubEnv("CLIENT_DATABASE_SCHEMA","public");vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));vi.stubEnv("WHATSAPP_VERIFICATION_ENABLED","true");vi.stubEnv("KAPSO_WEBHOOK_SECRET",randomBytes(32).toString("hex"));vi.stubEnv("KAPSO_PHONE_NUMBER_ID","1368248166370894");await db.exec(await readFile('sql/clients/001-customers.sql','utf8'));await db.exec(await readFile('sql/integrations/002-whatsapp-verification.sql','utf8'));},30000);
beforeEach(async()=>{await db.exec('DELETE FROM oc_client_user;DELETE FROM oc_client_registration_limit;');await user('owner');});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
it('limita a tres códigos por hora aunque se cambie la IP y conserva el desafío al bloquear',async()=>{
 for(let i=0;i<3;i++){await createWhatsappChallenge('owner','192.0.2.'+i);await cooldown();}
 const before=(await query('SELECT token_hash FROM oc_client_whatsapp_challenges')).rows[0];
 await expect(createWhatsappChallenge('owner','198.51.100.4')).rejects.toMatchObject({status:429});
 expect((await query('SELECT token_hash FROM oc_client_whatsapp_challenges')).rows[0]).toEqual(before);
});
it('el límite diario persiste al reiniciar las ventanas horarias',async()=>{
 const phoneHash=clientFingerprint(phone,'whatsapp-verification-phone');
 for(let i=0;i<6;i++){await resetCounter('issue-account-hour','owner');await resetCounter('issue-phone-hour',phoneHash);await createWhatsappChallenge('owner');await cooldown();}
 await resetCounter('issue-account-hour','owner');await resetCounter('issue-phone-hour',phoneHash);
 await expect(createWhatsappChallenge('owner')).rejects.toMatchObject({status:429,retryAfterSeconds:expect.any(Number)});
});
it('compartir un teléfono entre cuentas no evade el límite por número',async()=>{
 await createWhatsappChallenge('owner');for(let i=0;i<2;i++){await user('shared'+i);await createWhatsappChallenge('shared'+i,'192.0.2.'+i);}
 await user('blocked');await expect(createWhatsappChallenge('blocked','203.0.113.1')).rejects.toMatchObject({status:429});
});
it('limita la misma IP aunque use cuentas y teléfonos diferentes',async()=>{
 for(let i=0;i<10;i++){await user('ip'+i,'+569100000'+String(i).padStart(2,'0'));await createWhatsappChallenge('ip'+i,'192.0.2.4');}
 await user('ipblocked','+56920000000');await expect(createWhatsappChallenge('ipblocked','192.0.2.4')).rejects.toMatchObject({status:429});
});
it('corta la emisión global sin crear un desafío ni alterar la cuenta',async()=>{
 await query('INSERT INTO oc_client_registration_limit(key,count,reset_at) VALUES($1,120,now()+interval \'1 hour\')',[clientFingerprint('all','wa-verification:issue-global-hour')]);
 await expect(createWhatsappChallenge('owner')).rejects.toMatchObject({status:429});expect((await query('SELECT * FROM oc_client_whatsapp_challenges')).rows).toHaveLength(0);
 expect((await query('SELECT "whatsappVerified" FROM oc_client_user')).rows[0].whatsappVerified).toBe(false);
});
it('resuelve consultas concurrentes con contadores SQL y no memoria por instancia',async()=>{
 const results=await Promise.allSettled(Array.from({length:40},()=>limitWhatsappStatus('owner','192.0.2.3')));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(30);
 expect(results.filter(r=>r.status==='rejected')).toHaveLength(10);
});
it('un número ya verificado no genera nuevos códigos ni consume cuotas',async()=>{
 await query('UPDATE oc_client_user SET "whatsappVerified"=true');expect(await createWhatsappChallenge('owner')).toEqual({verified:true});expect((await query('SELECT * FROM oc_client_registration_limit')).rows).toHaveLength(0);
});
it('acota eventos firmados desconocidos sin crear claves por teléfonos arbitrarios ni guardar códigos',async()=>{
 for(let i=0;i<5;i++)expect(await acceptKapsoVerification({id:'synthetic'+i,from:'+5691000000'+i,code:'A'.repeat(32),timestamp:Math.floor(Date.now()/1000)})).toBe(false);
 const rows=(await query('SELECT * FROM oc_client_registration_limit')).rows;expect(rows).toHaveLength(1);expect(rows[0].count).toBe(5);expect(JSON.stringify(rows)).not.toContain('+569');expect((await query('SELECT * FROM oc_client_whatsapp_receipts')).rows).toHaveLength(0);
});
it('aplica el corte global y por número a recepciones, sin respuestas salientes',async()=>{
 await query('INSERT INTO oc_client_registration_limit(key,count,reset_at) VALUES($1,300,now()+interval \'1 minute\')',[clientFingerprint('all','wa-verification:receipt-global')]);
 expect(await allowWhatsappReceipt(conn)).toBe(false);
 for(let i=0;i<10;i++)expect(await allowWhatsappReceipt(conn,'synthetic-phone-hash')).toBe(true);
 expect(await allowWhatsappReceipt(conn,'synthetic-phone-hash')).toBe(false);
});
it('normaliza IP y agrupa IPv6 /64; las cabeceras no sustituyen la identidad',()=>{
 const request=(value:string)=>new Request('https://opticaycristal.cl',{headers:{'x-real-ip':value}});
 expect(whatsappRequestIp(request('2001:db8:1:2::9'))).toBe('2001:0db8:0001:0002::/64');expect(whatsappRequestIp(request('2001:0db8:0001:0002:3:4:5:6'))).toBe('2001:0db8:0001:0002::/64');expect(whatsappRequestIp(request('invalid'))).toBe('unknown');expect(whatsappRequestIp(request('fe80::1%en0'))).toBe('unknown');expect(whatsappRequestIp(request('192.0.2.1'))).toBe('192.0.2.1');
});
