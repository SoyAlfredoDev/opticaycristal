import "server-only";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import {NOTIFICATION_FILTERS,type AdminNotification,type AdminNotificationFeed,type NotificationFilter,type NotificationKind} from "./notification-types";
export class NotificationError extends Error{constructor(message:string,public status=400){super(message);}}
function actorName(actor:string){if(!actor.trim()||actor.length>200)throw new NotificationError('Acceso restringido.',403);return actor.trim().toLowerCase();}
const publicKinds = ['order_received','request_received'];
const groups:Record<NotificationFilter,readonly NotificationKind[]>={all:[],customers:['customer_registered','survey_received'],sales:['sale_created','payment_received'],orders:['order_received'],requests:['request_received'],support:['ticket_created','customer_reply','mail_failed']};
const labels:Record<NotificationKind,string>={survey_received:'Nueva encuesta respondida',ticket_created:'Nuevo ticket',customer_reply:'El cliente respondió',mail_failed:'Correo de soporte sin confirmar',customer_registered:'Nuevo cliente registrado',sale_created:'Nueva venta registrada',payment_received:'Pago recibido',order_received:'Nuevo pedido web',request_received:'Nueva solicitud'};
type Row={id:string;kind:NotificationKind;ticket_id:string|null;entity_id:string|null;customer_id:string|null;sale_id:string|null;reference:string|null;folio:string|number|null;created_at:string;read:boolean};
function notification(item:Row):AdminNotification{
 const ticket=item.ticket_id;
 const entity=item.entity_id;
 const customer=item.customer_id;
 let href='/admin/notificaciones';
 if(item.kind==='survey_received')href='/admin/encuestas';
 else if(ticket)href=`/admin/clientes/soporte?ticket=${encodeURIComponent(ticket)}`;
 else if(item.kind==='customer_registered'&&entity)href=`/admin/clientes/${encodeURIComponent(entity)}`;
 else if((item.kind==='sale_created'||item.kind==='payment_received')&&customer&&item.sale_id)href=`/admin/clientes/${encodeURIComponent(customer)}#venta-${encodeURIComponent(item.sale_id)}`;
 else if(item.kind==='order_received'&&entity)href=`/admin/pedidos#pedido-${encodeURIComponent(entity)}`;
 else if(item.kind==='request_received'&&entity)href=`/admin#solicitud-${encodeURIComponent(entity)}`;
 const label=item.kind==='request_received'?(item.reference?.startsWith('CON-')?'Nueva solicitud de convenio':'Nueva solicitud de jornada'):labels[item.kind];
 return{id:item.id,kind:item.kind,...(ticket?{ticketId:ticket}:{}),...(entity?{entityId:entity}:{}),folio:ticket?`AYU-${String(item.folio).padStart(5,'0')}`:item.reference||'Registro',createdAt:new Date(item.created_at).toISOString(),read:item.read,label,href};
}
export async function getAdminNotifications(actor:string,{unread=false,offset=0,limit=50,category='all',allowCustomers=true}:{unread?:boolean;offset?:number;limit?:number;category?:string;allowCustomers?:boolean}={}):Promise<AdminNotificationFeed>{
 const user=actorName(actor);
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000||!Number.isSafeInteger(limit)||limit<1||limit>50)throw new NotificationError('Página no válida.');
 if(!NOTIFICATION_FILTERS.includes(category as NotificationFilter))throw new NotificationError('Tipo de aviso no válido.');
 const kinds=groups[category as NotificationFilter];
 const result=await clientPool().query(`WITH feed AS(
 SELECT n.id,n.kind,n.ticket_id,n.entity_id,n.customer_id,n.sale_id,n.reference,n.created_at,t.folio,
 EXISTS(SELECT 1 FROM ${t('oc_client_admin_notification_reads')} r WHERE r.notification_id=n.id AND r.actor=$1) AS read
 FROM ${t('oc_client_admin_notifications')} n LEFT JOIN ${t('oc_client_support_tickets')} t ON t.id=n.ticket_id
 WHERE ($5::boolean OR n.kind=ANY($6::text[])) AND (cardinality($7::text[])=0 OR n.kind=ANY($7::text[]))
 ),page AS(SELECT * FROM feed WHERE (NOT $2::boolean OR NOT read) ORDER BY created_at DESC,id DESC LIMIT $4 OFFSET $3)
 SELECT (SELECT count(*)::int FROM feed WHERE NOT read) AS unread_count,COALESCE((SELECT json_agg(p ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'::json) AS items,clock_timestamp() AS as_of`,[user,unread,offset,limit+1,allowCustomers,publicKinds,kinds]);
 const row=result.rows[0],rows=row.items as Row[];
 return{unreadCount:Number(row.unread_count),hasMore:rows.length>limit,asOf:new Date(row.as_of).toISOString(),items:rows.slice(0,limit).map(notification)};
}
export async function markAdminNotificationsRead(actor:string,raw:unknown,{allowCustomers=true}:{allowCustomers?:boolean}={}){
 const user=actorName(actor);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new NotificationError('Datos no válidos.');const input=raw as Record<string,unknown>;
 const valid=(id:unknown)=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 if(input.action==='read'){
  if(!valid(input.id))throw new NotificationError('Aviso no válido.');
  const found=await clientPool().query(`INSERT INTO ${t('oc_client_admin_notification_reads')}(notification_id,actor)
   SELECT id,$2 FROM ${t('oc_client_admin_notifications')} WHERE id=$1 AND ($3::boolean OR kind=ANY($4::text[]))
   ON CONFLICT(notification_id,actor) DO UPDATE SET read_at=${t('oc_client_admin_notification_reads')}.read_at RETURNING notification_id`,[input.id,user,allowCustomers,publicKinds]);
  if(!found.rows.length)throw new NotificationError('Aviso no encontrado.',404);
 }else if(input.action==='read_page'){
  if(!Array.isArray(input.ids)||input.ids.length<1||input.ids.length>50||!input.ids.every(valid))throw new NotificationError('Selecciona los avisos visibles.');
  await clientPool().query(`INSERT INTO ${t('oc_client_admin_notification_reads')}(notification_id,actor) SELECT id,$1 FROM ${t('oc_client_admin_notifications')} WHERE id=ANY($2::uuid[]) AND ($3::boolean OR kind=ANY($4::text[])) ON CONFLICT DO NOTHING`,[user,input.ids,allowCustomers,publicKinds]);
 }else throw new NotificationError('Acción no válida.');
}
