// Isolated evaluation server: no .env files, remote databases or direct mail calls.
// Optional handoff exposes a test message for an explicitly authorized external sender; default transport only captures it.
import {PGlite} from '@electric-sql/pglite';
import {createServer} from 'vite';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(project,'.cache','notifications-preview');
const db=new PGlite();
process.env.CLIENT_DATA_KEY=randomBytes(32).toString('base64');
process.env.CLIENT_LEVEL_MAIL_ENABLED='false';
let lastLevelMail=null;
const handoff=process.env.OC_PREVIEW_MAIL_HANDOFF==='true';
const testRecipient=process.env.OC_PREVIEW_TEST_RECIPIENT?.trim();
if(handoff&&(!testRecipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)))throw Error('Explicit test recipient required for the local handoff');
let capturedCount=0,pendingDelivery=null;
await db.exec('CREATE SCHEMA preview_clients; CREATE SCHEMA preview_website; SET search_path TO preview_clients; CREATE TABLE preview_website.website_orders(id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE preview_website.website_requests(id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());');
for(const file of ['001-customers.sql','002-sales.sql','003-audit.sql','006-categories.sql','004-support.sql','005-support-mail.sql','007-installments.sql','008-admin-notifications.sql','010-payment-commitments.sql','018-level-upgrade-mail.sql'])await db.exec(await readFile(path.join(project,'sql','clients',file),'utf8'));
await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES('preview-customer','Cliente ficticio','preview@example.invalid','Cliente','Ficticio','synthetic','preview','synthetic',true)`);
if(handoff)await db.query(`UPDATE oc_client_user SET email=$1,"firstName"='Alfredo' WHERE id='preview-customer'`,[testRecipient]);
await db.query(`INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('preview-product','Lentes de prueba',10000,'demo')`);
async function insertSale(id){await db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by) VALUES($1,'preview-customer',$2,'{}','preview-product','Lentes de prueba',1,10000,100000,84034,15966,100000,0,0,'start',30,40000,0,true,'preview','demo')`,[id,randomUUID()]);}
await insertSale('preview-sale');
const ticket=randomUUID();await db.query(`INSERT INTO oc_client_support_tickets(id,customer_id,subject_cipher,request_key) VALUES($1,'preview-customer','synthetic',$2)`,[ticket,randomUUID()]);
await db.exec(await readFile(path.join(project,'sql/clients/016-business-notifications.sql'),'utf8'));
await db.query("SELECT set_config('oc.website_schema','preview_website',false)");await db.exec(await readFile(path.join(project,'sql/clients/017-website-notifications.sql'),'utf8'));
// This is the only database reachable by the production notification service in this preview.
const previewQuery=async(sql,values)=>{const r=await db.query(sql,values);return{...r,rowCount:r.affectedRows??r.rows.length};};
globalThis.__ocNotificationPreviewPool={query:previewQuery,connect:async()=>({query:previewQuery,release(){}})};
await mkdir(root,{recursive:true});
await writeFile(path.join(root,'db.ts'),`export const clientPool=()=>globalThis.__ocNotificationPreviewPool;export const clientTable=(name:string)=>'"preview_clients"."'+name+'"';`);
await writeFile(path.join(root,'empty.ts'),'export {};');
await writeFile(path.join(root,'navigation.ts'),`export const useRouter=()=>({refresh:()=>window.dispatchEvent(new Event('oc-level-preview-refresh'))});`);
await writeFile(path.join(root,'resend.ts'),`export const resendConfigured=()=>false;export const enviarConResend=()=>{throw Error('Real email is blocked in this preview');};`);
await writeFile(path.join(root,'link.tsx'),`import type {AnchorHTMLAttributes} from 'react';export default function Link({onClick,href,...props}:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props} href={href} onClick={event=>{event.preventDefault();onClick?.(event);window.dispatchEvent(new CustomEvent('preview-destination',{detail:href}));}}/>;}`);
await writeFile(path.join(root,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avisos · Desarrollo aislado</title><div id="root"></div><script type="module" src="/main.tsx"></script></html>`);
await writeFile(path.join(root,'main.tsx'),`
import {useEffect,useState} from 'react';import{createRoot}from'react-dom/client';
import{AdminNotificationBell,AdminNotificationsPage}from'@/components/admin/AdminNotifications';
import './preview.css';
function App(){const[actor,setActor]=useState('admin-a'),[limited,setLimited]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);useEffect(()=>{const open=(event)=>setNotice('Destino del aviso: '+event.detail);window.addEventListener('preview-destination',open);return()=>window.removeEventListener('preview-destination',open);},[]);
function scope(actor,limited){document.cookie='oc_preview_actor='+actor+';path=/;SameSite=Strict';document.cookie='oc_preview_scope='+(limited?'web':'all')+';path=/;SameSite=Strict';window.dispatchEvent(new Event('oc-admin-notifications'));}
useEffect(()=>scope(actor,limited),[]);
async function event(kind){setBusy(true);try{const r=await fetch('/dev/notification-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind})});if(!r.ok)throw Error();setNotice('Evento ficticio guardado. Revisa la campana y la bandeja.');window.dispatchEvent(new Event('oc-admin-notifications'));}catch{setNotice('No se pudo crear el evento de prueba.');}finally{setBusy(false);}}
return <><header><div><strong>DESARROLLO · DATOS FICTICIOS</strong><p>Base en memoria. No conecta con producción y no envía correos. Reiniciar el servidor borra este escenario.</p></div><AdminNotificationBell/></header><section className="controls" aria-label="Evaluación de avisos"><label>Usuario de prueba<select value={actor} onChange={e=>{setActor(e.target.value);scope(e.target.value,limited);}}><option value="admin-a">Administrador A</option><option value="admin-b">Administrador B</option></select></label><label><input type="checkbox" checked={limited} onChange={e=>{setLimited(e.target.checked);scope(actor,e.target.checked);}}/> Ver solo avisos web (sin acceso a clientes)</label><div className="events">{[['customer','Cliente nuevo'],['sale','Venta registrada'],['payment','Pago recibido'],['order','Pedido web'],['jornada','Solicitud de jornada'],['convenio','Solicitud de convenio'],['support','Mensaje de soporte']].map(([kind,label])=><button key={kind} disabled={busy} onClick={()=>event(kind)}>{label}</button>)}</div>{notice&&<p role="status">{notice}</p>}</section><AdminNotificationsPage/></>;}createRoot(document.getElementById('root')).render(<App/>);
`);
await writeFile(path.join(root,'preview.css'),`body{margin:0;font:15px Arial,sans-serif;color:#142b3a;background:#fafcfb}*{box-sizing:border-box}button,select{font:inherit}header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px clamp(18px,3vw,40px);border-bottom:1px solid #cde4d8;background:#e5f8ec}header strong{font-size:13px;color:#006c50}header p{font-size:13px;line-height:1.6;margin:7px 0 0;max-width:700px}.controls{padding:20px clamp(18px,3vw,40px);display:flex;gap:18px;flex-wrap:wrap;align-items:center;max-width:1260px;margin:auto}.controls label{display:flex;gap:9px;align-items:center;font-size:13px}.controls select,.events button{border:1px solid #cde4d8;background:white;color:#164735;border-radius:10px;min-height:44px;padding:8px 12px}.events{display:flex;flex-wrap:wrap;gap:8px;width:100%}.events button{cursor:pointer}.controls p{margin:0;font-size:13px;overflow-wrap:anywhere}button:focus-visible,select:focus-visible{outline:3px solid #007f5f;outline-offset:3px}@media(max-width:650px){header{align-items:flex-start}.controls label{flex-wrap:wrap}.events button{flex:1 1 130px}}`);
await writeFile(path.join(root,'evaluar-niveles.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ascensos · Desarrollo aislado</title><div id="root"></div><script type="module" src="/levels.tsx"></script></html>`);
await writeFile(path.join(root,'levels.tsx'),`
import{useEffect,useState}from'react';import{createRoot}from'react-dom/client';import{AdminCustomerCategory}from'@/components/clients/AdminCustomerCategory';import{CustomerCategories}from'@/components/clients/CustomerCategories';import base from'@/components/clients/ClientSpace.module.css';import'./preview.css';
function App(){const[settings,setSettings]=useState(null),[error,setError]=useState('');async function refresh(){try{const r=await fetch('/api/admin/clientes/preview-customer/categoria',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error();setSettings(d.settings);setError('');}catch{setError('No se pudo cargar la evaluación.');}}useEffect(()=>{refresh();window.addEventListener('oc-level-preview-refresh',refresh);return()=>window.removeEventListener('oc-level-preview-refresh',refresh);},[]);return <><header><div><strong>${handoff?"DESARROLLO · PRUEBA DE ENTREGA CONTROLADA":"DESARROLLO · ASCENSOS Y CORREOS SIMULADOS"}</strong><p>${handoff?"Solo datos ficticios en memoria. El mensaje queda pendiente para un envío externo autorizado al destinatario de prueba; este servidor no llama a Resend.":"Solo datos ficticios en memoria. Prueba un ascenso manual: el cambio usa el servicio real y su cola, y el correo se captura aquí sin llamar a Resend."} No hay ascensos automáticos activos.</p></div></header><main className={base.space} style={{padding:'24px 18px',maxWidth:1200,margin:'auto'}}><h1>Evalúa un cambio de nivel</h1>{error&&<p role="alert">{error}</p>}{settings&&<><AdminCustomerCategory key={settings.currentCategory+':'+(settings.history[0]?.id||'initial')} customerId="preview-customer" initial={settings} canEdit/><div style={{marginTop:24}}><h2>Lo que ve el cliente</h2><CustomerCategories tiers={settings.tiers} currentCategory={settings.currentCategory}/></div><section style={{marginTop:24}}><h2>Última felicitación simulada</h2><p>${handoff?"El estado aceptado requiere registrar la confirmación del proveedor externo de la prueba.":"No se ha enviado este correo. La aceptación que figura en el historial es del transporte simulado."}</p><iframe key={settings.history[0]?.id||'initial'} title="Felicitación simulada por ascenso" src="/dev/level-mail" sandbox="" style={{width:'100%',height:1600,border:'1px solid #e3eaf0',borderRadius:16}}/></section></>}</main></>;}createRoot(document.getElementById('root')).render(<App/>);
`);
const server=await createServer({plugins:[{name:'isolated-notifications',enforce:'pre',resolveId(source,importer){if(source==='./db'&&importer?.includes('/src/lib/clients/'))return path.join(root,'db.ts');},configureServer(vite){vite.middlewares.use(previewMiddleware);}}],configFile:false,root,envDir:root,cacheDir:path.join(root,'vite-cache'),oxc:{jsx:{runtime:'automatic'}},resolve:{alias:[{find:'@/lib/clients/db',replacement:path.join(root,'db.ts')},{find:'@/lib/mail/resend',replacement:path.join(root,'resend.ts')},{find:'next/navigation',replacement:path.join(root,'navigation.ts')},{find:'server-only',replacement:path.join(root,'empty.ts')},{find:'next/link',replacement:path.join(root,'link.tsx')},{find:'@',replacement:path.join(project,'src')}]},server:{host:'127.0.0.1',port:3102,strictPort:true,fs:{allow:[project]}}});
let eventQueue=Promise.resolve();
async function previewMiddleware(req,res,next){
 if(!req.url?.startsWith('/api/admin/notificaciones')&&!req.url?.startsWith('/dev/notification-event')&&!req.url?.startsWith('/api/admin/clientes/preview-customer/categoria')&&!req.url?.startsWith('/dev/level-mail'))return next();
 const origin='http://127.0.0.1:3102';res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 try{
  if(!['GET','POST'].includes(req.method)){res.statusCode=405;return res.end('{}');}
  if(req.method==='POST'&&req.headers.origin!==origin){res.statusCode=403;return res.end(JSON.stringify({error:'Origen no permitido.'}));}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Body limit');}
  const body=raw?JSON.parse(raw):null;
  if(req.url.startsWith('/dev/level-mail/metrics')){
   const jobs=(await db.query(`SELECT id,change_id,state,attempts,provider_id FROM preview_clients.oc_client_level_mail ORDER BY created_at,id`)).rows;
   const history=(await db.query(`SELECT count(*)::int AS count FROM preview_clients.oc_client_category_changes WHERE customer_id='preview-customer'`)).rows[0].count;
   return res.end(JSON.stringify({handoff,capturedCount,historyCount:history,jobs,pending:Boolean(pendingDelivery)}));
  }
  if(req.url.startsWith('/dev/level-mail/pending')){return res.end(JSON.stringify(pendingDelivery?{message:pendingDelivery.message}:{}));}
  if(req.url.startsWith('/dev/level-mail/ack')){
   if(req.method!=='POST'||!handoff||!pendingDelivery||body?.idempotencyKey!==pendingDelivery.message.idempotencyKey||typeof body?.providerId!=='string'){res.statusCode=400;return res.end('{}');}
   const delivery=pendingDelivery;pendingDelivery=null;clearTimeout(delivery.timer);delivery.resolve({ok:true,id:body.providerId,error:null});return res.end('{"ok":true}');
  }
  if(req.url.startsWith('/dev/level-mail')){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(lastLevelMail||'<html lang="es"><body style="font:15px Arial;padding:24px;color:#536574">La felicitación simulada aparecerá después de un ascenso manual. No se envía ningún correo real.</body></html>');}
  if(req.url.startsWith('/api/admin/clientes/preview-customer/categoria')){
   const levels=await server.ssrLoadModule(path.join(project,'src/lib/clients/categories.ts'));
   if(req.method==='GET')return res.end(JSON.stringify({settings:await levels.getCategorySettings('preview-customer'),canEdit:true}));
   const result=await levels.changeCustomerCategory('preview-customer',body,'administrador.demo');
   const mail=await server.ssrLoadModule(path.join(project,'src/lib/clients/level-mail.ts'));
   await mail.drainLevelUpgradeMail({customerId:'preview-customer'},{transport:async message=>{
    capturedCount++;
    const logo=(await readFile(path.join(project,'public/images/home/oc-logo-oficial.png'))).toString('base64');lastLevelMail=message.html.replaceAll('cid:logo-opticaycristal','data:image/png;base64,'+logo);
    if(!handoff)return{ok:true,id:'simulated-provider-'+randomUUID(),error:null};
    if(message.to!==testRecipient||pendingDelivery)throw Error('Unexpected local test recipient or concurrent handoff');
    return new Promise(resolve=>{const timer=setTimeout(()=>{pendingDelivery=null;resolve({ok:false,id:null,error:'Local test handoff timed out'});},110000);pendingDelivery={message,resolve,timer};});
   }});
   return res.end(JSON.stringify({...result,settings:await levels.getCategorySettings('preview-customer')}));
  }

  if(req.url.startsWith('/dev/notification-event')){
   if(req.method!=='POST'){res.statusCode=405;return res.end('{}');}
   const kind=body?.kind;if(!['customer','sale','payment','order','jornada','convenio','support'].includes(kind)){res.statusCode=400;return res.end('{}');}
   const action=async()=>{const id=randomUUID();
    if(kind==='customer')await db.query(`INSERT INTO preview_clients.oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,'Cliente ficticio',$2,'Cliente','Ficticio','synthetic',$1,'synthetic')`,[id,id+'@example.invalid']);
    else if(kind==='sale')await insertSale(id);
    else if(kind==='payment')await db.query(`INSERT INTO preview_clients.oc_client_payments(id,sale_id,request_key,amount,paid_on,reference,created_by) VALUES($1,'preview-sale',$2,1000,current_date,'Pago ficticio','demo')`,[id,randomUUID()]);
    else if(kind==='order')await db.query(`INSERT INTO preview_website.website_orders(id,payload) VALUES($1,'{}')`,[id]);
    else if(kind==='jornada'||kind==='convenio')await db.query(`INSERT INTO preview_website.website_requests(id,payload) VALUES($1,$2::jsonb)`,[id,JSON.stringify({origen:kind})]);
    else await db.query(`INSERT INTO preview_clients.oc_client_support_messages(id,ticket_id,actor_kind,author_id,body_cipher,request_key) VALUES($1,$2,'customer','preview-customer','synthetic',$3)`,[id,ticket,randomUUID()]);
   };eventQueue=eventQueue.then(action,action);await eventQueue;return res.end('{"ok":true}');
  }
  const cookies=req.headers.cookie||'';const actor=cookies.includes('oc_preview_actor=admin-b')?'admin-b':'admin-a',allowCustomers=!cookies.includes('oc_preview_scope=web');
  const service=await server.ssrLoadModule(path.join(project,'src/lib/admin/notifications.ts'));
  if(req.method==='GET'){
   const url=new URL(req.url,origin);return res.end(JSON.stringify(await service.getAdminNotifications(actor,{allowCustomers,unread:url.searchParams.get('unread')==='1',offset:Number(url.searchParams.get('offset')||0),limit:Number(url.searchParams.get('limit')||50),category:url.searchParams.get('category')||'all'})));
  }
  await service.markAdminNotificationsRead(actor,body,{allowCustomers});return res.end('{"ok":true}');
 }catch(error){res.statusCode=error?.status||500;res.end(JSON.stringify({error:'No se pudo completar la prueba local.'}));console.error('Fallo de la evaluación local:',error?.name);}
}
await server.listen();console.log('Evaluación aislada: http://127.0.0.1:3102 — sin producción. Transporte: '+(handoff?'entrega externa controlada':'captura sin envío')+'.');
async function stop(){await server.close();await db.close();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);
