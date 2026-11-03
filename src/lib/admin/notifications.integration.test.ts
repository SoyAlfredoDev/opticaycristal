// @vitest-environment node
import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
const state=vi.hoisted(()=>({pool:null as unknown,staff:true,allowed:true,actor:'AdminA'}));
vi.mock('@/lib/clients/db',()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock('@/lib/auth',()=>({getSession:async()=>state.staff?{u:state.actor}:null}));
vi.mock('@/lib/clients/admin',()=>({customerAdminSession:async()=>state.staff&&state.allowed?{u:state.actor}:null}));
import {getAdminNotifications as getFeed,markAdminNotificationsRead} from './notifications';
import {searchCustomerSummaries} from '@/lib/clients/store';
import {clientFingerprint} from '@/lib/clients/privacy';
import {GET,POST} from '@/app/api/admin/notificaciones/route';
const getAdminNotifications=(actor:string,options:Parameters<typeof getFeed>[1]={})=>getFeed(actor,{...options,category:'support'});
const db=new PGlite();const query=async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};};state.pool={query};
let ticketId:string;
async function message(role='customer',createdAt?:string){const id=randomUUID();await db.query(`INSERT INTO oc_client_support_messages(id,ticket_id,actor_kind,author_id,body_cipher,request_key,created_at) VALUES($1,$2,$3,$4,'private-body',$5,COALESCE($6::timestamptz,clock_timestamp()))`,[id,ticketId,role,role==='customer'?'qa-user':'AdminA',randomUUID(),createdAt??null]);return id;}
beforeAll(async()=>{vi.stubEnv('CLIENT_DATA_KEY',randomBytes(32).toString('base64'));vi.stubEnv('CLIENT_APP_URL','https://opticaycristal.cl');for(const file of ['001-customers.sql','002-sales.sql','003-audit.sql','004-support.sql','005-support-mail.sql','006-categories.sql','007-installments.sql','008-admin-notifications.sql','008-admin-notifications.sql','010-payment-commitments.sql','016-business-notifications.sql'])await db.exec(await readFile('sql/clients/'+file,'utf8'));},30000);
beforeEach(async()=>{state.staff=true;state.allowed=true;state.actor='AdminA';await db.exec('TRUNCATE oc_client_user CASCADE');await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES('qa-user','Cliente QA','qa@example.invalid','Cliente','QA','private-rut','qa-rut','private-phone')`);ticketId=randomUUID();await db.query(`INSERT INTO oc_client_support_tickets(id,customer_id,subject_cipher,request_key) VALUES($1,'qa-user','private-subject',$2)`,[ticketId,randomUUID()]);});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
const request=(body:unknown,origin='https://opticaycristal.cl')=>new Request('https://opticaycristal.cl/api/admin/notificaciones',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
describe.sequential('Notificaciones administrativas con PostgreSQL aislado',()=>{
 it('captura creación y respuesta del cliente, omite mensajes del personal y conserva lectura por administrador',async()=>{
  await message();await message('admin');await message();const a=await getAdminNotifications('AdminA');expect(a.unreadCount).toBe(2);expect(a.items.map(i=>i.kind)).toEqual(['customer_reply','ticket_created']);expect(JSON.stringify(a)).not.toMatch(/private-subject|private-body|qa@example/);
  await markAdminNotificationsRead('AdminA',{action:'read',id:a.items[0].id,actor:'AdminB'});await markAdminNotificationsRead('AdminA',{action:'read',id:a.items[0].id});expect((await getAdminNotifications('admina')).unreadCount).toBe(1);expect((await getAdminNotifications('AdminB')).unreadCount).toBe(2);expect((await db.query<{status:string}>(`SELECT status FROM oc_client_support_tickets WHERE id=$1`,[ticketId])).rows[0].status).toBe('abierto');
 });
 it('no duplica avisos por reintentos de migración o por actualizaciones repetidas del correo',async()=>{
  const m=await message();const id=randomUUID();await db.query(`INSERT INTO oc_client_support_mail(id,ticket_id,message_id,kind,payload_cipher,state) VALUES($1,$2,$3,'ticket_created','private-payload','failed')`,[id,ticketId,m]);await db.query(`UPDATE oc_client_support_mail SET state='failed' WHERE id=$1`,[id]);await db.exec(await readFile('sql/clients/008-admin-notifications.sql','utf8'));const feed=await getAdminNotifications('AdminA');expect(feed.items).toHaveLength(2);expect(feed.items.filter(i=>i.kind==='mail_failed')).toHaveLength(1);
 });
 it('marca solo la página revisada y no consume avisos que llegan después aunque tengan fecha anterior',async()=>{
  await message();const snapshot=await getAdminNotifications('AdminA');await message('customer',new Date(Date.parse(snapshot.asOf)-1000).toISOString());await markAdminNotificationsRead('AdminA',{action:'read_page',ids:snapshot.items.map(item=>item.id)});expect((await getAdminNotifications('AdminA',{unread:true})).items).toHaveLength(1);
 });
 it('pagina sin duplicados y mantiene el contador global',async()=>{
  for(let i=0;i<7;i++)await message();const a=await getAdminNotifications('AdminA',{limit:3}),b=await getAdminNotifications('AdminA',{limit:3,offset:3});expect(a.hasMore).toBe(true);expect(a.unreadCount).toBe(7);expect(new Set([...a.items,...b.items].map(i=>i.id)).size).toBe(6);
 });
 it('protege la API ante falta de sesión, permisos, origen externo e identificadores inválidos',async()=>{
  state.staff=false;expect((await GET(new Request('https://opticaycristal.cl/api/admin/notificaciones'))).status).toBe(401);state.staff=true;state.allowed=false;expect((await GET(new Request('https://opticaycristal.cl/api/admin/notificaciones'))).status).toBe(200);state.allowed=true;expect((await POST(request({action:'read_all',asOf:new Date().toISOString()},'https://outside.invalid'))).status).toBe(403);expect((await POST(request({action:'read',id:'bad'}))).status).toBe(400);expect((await GET(new Request('https://opticaycristal.cl/api/admin/notificaciones?limit=1000'))).status).toBe(400);
 });
 it('paginación de clientes y búsqueda exacta por RUT no exponen campos cifrados',async()=>{
  for(let i=0;i<54;i++)await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,$2,$3,'Prueba','QA','private-rut',$4,'private-phone')`,['search-'+String(i).padStart(3,'0'),'Persona '+i,`person${i}@example.invalid`,i===53?clientFingerprint('123456785','rut'):'search-hash-'+i]);
  const a=await searchCustomerSummaries(),b=await searchCustomerSummaries('',50);expect(a.customers).toHaveLength(50);expect(a.hasMore).toBe(true);expect(b.customers).toHaveLength(5);expect(b.hasMore).toBe(false);expect(new Set([...a.customers,...b.customers].map(c=>c.id)).size).toBe(55);const found=await searchCustomerSummaries('12.345.678-5');expect(found.customers.map(c=>c.id)).toEqual(['search-053']);expect(JSON.stringify(found)).not.toMatch(/private-rut|rutCipher|rutHash|whatsappCipher/);
 });
});
