import "server-only";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import type {AdminNotification,AdminNotificationFeed} from "./notification-types";
export class NotificationError extends Error{constructor(message:string,public status=400){super(message);}}
function actorName(actor:string){if(!actor.trim()||actor.length>200)throw new NotificationError('Acceso restringido.',403);return actor.trim().toLowerCase();}
export async function getAdminNotifications(actor:string,{unread=false,offset=0,limit=50}:{unread?:boolean;offset?:number;limit?:number}={}):Promise<AdminNotificationFeed>{
 const user=actorName(actor);
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000||!Number.isSafeInteger(limit)||limit<1||limit>50)throw new NotificationError('Página no válida.');
 const result=await clientPool().query(`WITH feed AS(SELECT n.id,n.kind,n.ticket_id,n.created_at,t.folio,EXISTS(SELECT 1 FROM ${t('oc_client_admin_notification_reads')} r WHERE r.notification_id=n.id AND r.actor=$1) AS read FROM ${t('oc_client_admin_notifications')} n JOIN ${t('oc_client_support_tickets')} t ON t.id=n.ticket_id),page AS(SELECT * FROM feed WHERE (NOT $2::boolean OR NOT read) ORDER BY created_at DESC,id DESC LIMIT $4 OFFSET $3) SELECT (SELECT count(*)::int FROM feed WHERE NOT read) AS unread_count,COALESCE((SELECT json_agg(p ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'::json) AS items,clock_timestamp() AS as_of`,[user,unread,offset,limit+1]);
 const row=result.rows[0],rows=row.items as {id:string;kind:AdminNotification['kind'];ticket_id:string;folio:string|number;created_at:string;read:boolean}[];
 return {unreadCount:Number(row.unread_count),hasMore:rows.length>limit,asOf:new Date(row.as_of).toISOString(),items:rows.slice(0,limit).map(item=>({id:item.id,kind:item.kind,ticketId:item.ticket_id,folio:`AYU-${String(item.folio).padStart(5,'0')}`,createdAt:new Date(item.created_at).toISOString(),read:item.read,label:({ticket_created:'Nuevo ticket',customer_reply:'El cliente respondió',mail_failed:'Correo sin confirmar'})[item.kind],href:`/admin/clientes/soporte?ticket=${item.ticket_id}`}))};
}
export async function markAdminNotificationsRead(actor:string,raw:unknown){
 const user=actorName(actor);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new NotificationError('Datos no válidos.');const input=raw as Record<string,unknown>;
 if(input.action==='read'){
  if(typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id))throw new NotificationError('Aviso no válido.');
  const found=await clientPool().query(`SELECT id FROM ${t('oc_client_admin_notifications')} WHERE id=$1`,[input.id]);if(!found.rows[0])throw new NotificationError('Aviso no encontrado.',404);
  await clientPool().query(`INSERT INTO ${t('oc_client_admin_notification_reads')}(notification_id,actor) VALUES($1,$2) ON CONFLICT DO NOTHING`,[input.id,user]);
 }else if(input.action==='read_page'){
  if(!Array.isArray(input.ids)||input.ids.length<1||input.ids.length>50||!input.ids.every(id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw new NotificationError('Selecciona los avisos visibles.');
  await clientPool().query(`INSERT INTO ${t('oc_client_admin_notification_reads')}(notification_id,actor) SELECT id,$1 FROM ${t('oc_client_admin_notifications')} WHERE id=ANY($2::uuid[]) ON CONFLICT DO NOTHING`,[user,input.ids]);
 }else throw new NotificationError('Acción no válida.');
}
