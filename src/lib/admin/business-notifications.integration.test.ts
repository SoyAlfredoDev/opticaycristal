// @vitest-environment node
import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
const state=vi.hoisted(()=>({pool:null as unknown,auth:null as unknown,webQuery:vi.fn(),staff:true,customers:true,actor:'admin-a'}));
vi.mock('@/lib/clients/db',()=>({clientPool:()=>state.pool,clientSchema:()=> 'app_dev',clientTable:(name:string)=>`"app_dev"."${name}"`}));
vi.mock('@neondatabase/serverless',()=>({neon:()=>({query:state.webQuery})}));
vi.mock('@/lib/clients/auth',async original=>({...await original<typeof import('@/lib/clients/auth')>(),clientAuth:()=>state.auth}));
vi.mock('@/lib/auth',()=>({getSession:async()=>state.staff?{u:state.actor}:null}));
vi.mock('@/lib/clients/admin',()=>({customerAdminSession:async()=>state.staff&&state.customers?{u:state.actor}:null}));
import {createClientAuth} from '@/lib/clients/auth';
import {POST as register} from '@/app/api/clientes/registro/route';
import {GET,POST} from '@/app/api/admin/notificaciones/route';
import {getAdminNotifications,markAdminNotificationsRead} from './notifications';
import {createSale,saveSaleProduct,parseSale,recordSalePayment,todayChile} from '@/lib/clients/sales';
import {createOrder} from '@/lib/orders/store';
import {createSolicitud,updateCorreoEstado} from '@/lib/solicitudes/store';
import {seedLegacyContractSettings} from '../../../tests/fixtures/legacy-contract-settings';
import {protectClientValue} from '@/lib/clients/privacy';
const db=new PGlite();
const conn={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return{...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
async function customer(id='new-customer'){
 await db.query(`INSERT INTO app_dev.oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES($1,'Nombre privado',$2,'Nombre','Privado',$3,$1,$4,true)`,[id,id+'@example.invalid',protectClientValue('123456785','rut'),protectClientValue('+56911112222','whatsapp')]);return id;
}
function order(id=randomUUID()) {return{id,createdAt:new Date().toISOString(),items:[{productId:'qa',title:'Lentes de prueba',image:'/images/catalog/oc-round-v01.png',quantity:1}],customer:{name:'Nombre privado',email:'order@example.invalid',phone:'+56911112222',comuna:'Santiago',address:'Dirección privada',comments:'Comentario privado',consent:true as const}};}
function solicitud(id=randomUUID()){return{id,origen:'jornada' as const,responsable:'Responsable privado',cargo:'RRHH',telefono:'+56911112222',correo:'request@example.invalid',empresa:'Empresa privada',region:'Metropolitana',mesEstimado:'noviembre',autorizacionDatos:true,correoDestino:'optica@example.invalid',correoEstado:'pendiente' as const,correoDetalle:null,correoClienteEstado:'pendiente' as const,correoClienteDetalle:null,creadoEn:new Date().toISOString()};}
async function sale(owner='buyer'){
 await customer(owner);const productId=await saveSaleProduct({name:'Producto de prueba',protectedCost:10000},'seller');
 const input=parseSale({customerId:owner,productId,quantity:1,total:100000,credit:30000,installmentCount:1,firstDueDate:'2030-01-31',identityChecked:true,depositReceived:true,requestKey:randomUUID()});
 return {id:await createSale(input,'seller'),input};
}
beforeAll(()=>{vi.stubEnv('CLIENT_DATA_KEY',randomBytes(32).toString('base64'));vi.stubEnv('CLIENT_AUTH_SECRET',randomBytes(32).toString('base64'));vi.stubEnv('CLIENT_APP_URL','http://localhost:3097');vi.stubEnv('DATABASE_URL','postgresql://test.invalid/dev');vi.stubEnv('WEBSITE_DATABASE_SCHEMA','site_dev');});
beforeEach(async()=>{
 await db.exec('DROP SCHEMA IF EXISTS app_dev CASCADE; DROP SCHEMA IF EXISTS site_dev CASCADE; CREATE SCHEMA app_dev; CREATE SCHEMA site_dev; SET search_path TO app_dev; CREATE TABLE site_dev.website_orders(id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE site_dev.website_requests(id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());');
 for(const file of ['001-customers.sql','002-sales.sql','003-audit.sql','004-support.sql','005-support-mail.sql','007-installments.sql','008-admin-notifications.sql','010-payment-commitments.sql','014-category-sale-pricing.sql'])await db.exec(await readFile('sql/clients/'+file,'utf8'));
 await seedLegacyContractSettings(db);
 await customer('legacy');await db.query(`INSERT INTO site_dev.website_orders VALUES('legacy-order','{}',now())`);
 await db.exec(await readFile('sql/clients/016-business-notifications.sql','utf8'));
 await db.query("SELECT set_config('oc.website_schema','site_dev',false)");await db.exec(await readFile('sql/clients/017-website-notifications.sql','utf8'));
 state.webQuery.mockImplementation(async(sql:string,values?:unknown[])=>(await conn.query(sql,values)).rows);
 state.staff=true;state.customers=true;state.actor='admin-a';state.auth=createClientAuth(state.pool as Pool,async()=>{});
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential('Avisos de eventos reales con PostgreSQL aislado',()=>{
 it('no convierte registros antiguos en avisos nuevos ni duplica al repetir migraciones',async()=>{
  expect((await getAdminNotifications('admin-a')).items).toEqual([]);
  await customer();await createOrder(order());
  await db.exec(await readFile('sql/clients/016-business-notifications.sql','utf8'));await db.exec(await readFile('sql/clients/017-website-notifications.sql','utf8'));
  expect((await getAdminNotifications('admin-a')).items).toHaveLength(2);
 });
 it('el registro público nuevo crea un aviso; un RUT duplicado no crea otro',async()=>{
  const request=(email:string)=>new Request('http://localhost:3097/api/clientes/registro',{method:'POST',headers:{origin:'http://localhost:3097','content-type':'application/json'},body:JSON.stringify({firstName:'Prueba',lastName:'Registro',rut:'12345678-5',whatsapp:'+56911112222',email,password:'Synthetic password only 2026!',privacyAccepted:true})});
  expect((await register(request('registration@example.invalid'))).status).toBe(200);
  expect((await register(request('duplicate@example.invalid'))).status).toBe(200);
  const feed=await getAdminNotifications('admin-a');expect(feed.items).toHaveLength(1);expect(feed.items[0]).toMatchObject({kind:'customer_registered',label:'Nuevo cliente registrado'});expect(feed.items[0].href).toMatch(/^\/admin\/clientes\//);
 },20000);
 it('la venta y el pago confirmados generan un solo aviso por operación, incluso al reintentar',async()=>{
  const saved=await sale();expect(await createSale(saved.input,'seller')).toBe(saved.id);
  const payment={saleId:saved.id,amount:1000,paidOn:todayChile(),reference:'Prueba aislada',requestKey:randomUUID()};
  await recordSalePayment(payment,'seller');await recordSalePayment(payment,'seller');
  const feed=await getAdminNotifications('admin-a',{category:'sales'});expect(feed.items.map(i=>i.kind).sort()).toEqual(['payment_received','sale_created']);expect(feed.items.every(i=>i.href===`/admin/clientes/buyer#venta-${saved.id}`)).toBe(true);
 });
 it('pedidos y solicitudes de formularios llegan desde sus almacenes reales sin exponer datos de contacto',async()=>{
  const o=order(),r=solicitud();await createOrder(o);await createSolicitud(r);await updateCorreoEstado(r.id,{correoEstado:'error',correoDetalle:'Fallo simulado',correoClienteEstado:'error',correoClienteDetalle:'Fallo simulado'});
  const feed=await getAdminNotifications('admin-a');expect(feed.items).toHaveLength(2);
  expect(feed.items.find(i=>i.kind==='order_received')).toMatchObject({href:`/admin/pedidos#pedido-${o.id}`,label:'Nuevo pedido web'});
  expect(feed.items.find(i=>i.kind==='request_received')).toMatchObject({href:`/admin#solicitud-${r.id}`,label:'Nueva solicitud de jornada'});
  expect(JSON.stringify(feed)).not.toMatch(/Nombre privado|Comentario privado|Dirección privada|example.invalid|Responsable privado|Empresa privada/);
  expect((await getAdminNotifications('admin-a',{category:'orders'})).unreadCount).toBe(1);
 });
 it('un rollback no deja avisos de registros que nunca se guardaron',async()=>{
  await db.exec('BEGIN');await customer('rolled-back');await db.query(`INSERT INTO site_dev.website_orders VALUES('rolled-back-order','{}',now())`);await db.exec('ROLLBACK');
  expect((await getAdminNotifications('admin-a')).items).toEqual([]);
 });
 it('un fallo del aviso revierte también el pedido en vez de confirmar una captura incompleta',async()=>{
  await db.exec("CREATE FUNCTION app_dev.fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated'; END $$; CREATE TRIGGER fail_notice BEFORE INSERT ON app_dev.oc_client_admin_notifications FOR EACH ROW EXECUTE FUNCTION app_dev.fail_notice();");
  const o=order();await expect(createOrder(o)).rejects.toThrow();expect((await db.query('SELECT id FROM site_dev.website_orders WHERE id=$1',[o.id])).rows).toEqual([]);
 });
 it('separa permisos y lectura por usuario sin filtrar información privada',async()=>{
  await customer();await createOrder(order());
  state.customers=false;
  const response=await GET(new Request('http://localhost:3097/api/admin/notificaciones'));const feed=await response.json();expect(response.status).toBe(200);expect(feed.items.map((i:{kind:string})=>i.kind)).toEqual(['order_received']);
  const privateNotice=(await getAdminNotifications('admin-a',{category:'customers'})).items[0];
  const mark=(id:string)=>new Request('http://localhost:3097/api/admin/notificaciones',{method:'POST',headers:{origin:'http://localhost:3097','content-type':'application/json'},body:JSON.stringify({action:'read',id,actor:'admin-b'})});
  expect((await POST(mark(privateNotice.id))).status).toBe(404);
  expect((await POST(mark(feed.items[0].id))).status).toBe(200);
  expect((await getAdminNotifications('admin-a',{allowCustomers:false})).unreadCount).toBe(0);expect((await getAdminNotifications('admin-b',{allowCustomers:false})).unreadCount).toBe(1);
  await markAdminNotificationsRead('admin-a',{action:'read_page',ids:[privateNotice.id]},{allowCustomers:false});expect((await getAdminNotifications('admin-a',{category:'customers'})).unreadCount).toBe(1);
 });
});
