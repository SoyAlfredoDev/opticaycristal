import 'server-only';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {clientPool,clientTable as t} from '@/lib/clients/db';
import {protectClientValue,revealClientValue} from '@/lib/clients/privacy';
import {createSupportTicketInTransaction,getSupportTicket,listSupportTickets} from '@/lib/clients/support';
import {digest,fail,text,uuid,type ApiKey} from './security';
export async function transaction<T>(work:(db:PoolClient)=>Promise<T>){const db=await clientPool().connect();try{await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='4s'");const out=await work(db);await db.query('COMMIT');return out;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
export function idempotency(request:Request){const value=request.headers.get('idempotency-key');if(!value||!/^[A-Za-z0-9_-]{16,128}$/.test(value))fail('IDEMPOTENCY_REQUIRED','Idempotency-Key de 16 a 128 caracteres requerido.');return digest(value);}
export function attachmentInput(body:Record<string,unknown>){
 const mime=body.mime;if(!['image/png','image/jpeg','application/pdf'].includes(String(mime)))fail('INVALID_ATTACHMENT','Tipo de adjunto no admitido.');
 const b64=text(body.contentBase64,1398104);if((!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4!==0))fail('INVALID_ATTACHMENT','Base64 no válido.');const bytes=Buffer.from(b64,'base64');
 if(bytes.length<8||bytes.length>1048576||bytes.toString('base64')!==b64)fail('INVALID_ATTACHMENT','Adjunto de hasta 1 MiB requerido.');
 const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,5).toString()==='%PDF-';
 if(!valid)fail('INVALID_ATTACHMENT','El contenido no corresponde al tipo.');
 return{mime:String(mime),bytes,b64};
}
export async function receiveAttachment(db:PoolClient,key:ApiKey,owner:string,body:Record<string,unknown>,requestHash:string,payloadHash:string){
 const input=attachmentInput(body);await db.query('SELECT id FROM '+t('oc_client_user')+' WHERE id=$1 FOR UPDATE',[owner]);
 const old=(await db.query(`SELECT * FROM ${t('oc_client_cris_attachments')} WHERE key_id=$1 AND request_hash=$2`,[key.id,requestHash])).rows[0];
 if(old){if(old.payload_hash!==payloadHash||old.customer_id!==owner||old.content_hash!==digest(input.bytes)||old.mime!==input.mime)fail('IDEMPOTENCY_CONFLICT','La clave ya fue usada con otros datos.',409);if(new Date(old.expires_at).getTime()<=Date.now())fail('ATTACHMENT_EXPIRED','El adjunto venció.',410);return{id:old.id,mime:old.mime,size:old.size,expiresAt:new Date(old.expires_at).toISOString(),scanStatus:'UNSCANNED',replayed:true};}

 const count=await db.query(`SELECT count(*)::int AS n FROM ${t('oc_client_cris_attachments')} WHERE customer_id=$1 AND expires_at>now()`,[owner]);if(Number(count.rows[0].n)>=20)fail('ATTACHMENT_LIMIT','Hay veinte adjuntos vigentes; solicita revisión humana.',429);
 const r=await db.query(`INSERT INTO ${t('oc_client_cris_attachments')}(id,key_id,customer_id,mime,size,content_hash,payload_enc,request_hash,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,mime,size,expires_at`,[randomUUID(),key.id,owner,input.mime,input.bytes.length,digest(input.bytes),protectClientValue(input.b64,'cris-attachment'),requestHash,payloadHash]);const row=r.rows[0];return{id:row.id,mime:row.mime,size:row.size,expiresAt:new Date(row.expires_at).toISOString(),scanStatus:'UNSCANNED',replayed:false};
}
export function receiptInput(action:string,body:Record<string,unknown>){
 const kind=action==='crear-ticket'?'ticket':action==='avisar-comprobante'?'comprobante':body.kind;
 if(!['ticket','evaluacion','jornada','convenio','comprobante'].includes(String(kind)))fail('INVALID_INPUT','Tipo de solicitud no válido.');
 if(action==='registrar-solicitud'&&!['evaluacion','jornada','convenio'].includes(String(kind)))fail('INVALID_INPUT','Tipo de solicitud no válido.');
 if(body.consent!==true)fail('CONSENT_REQUIRED','Confirma el consentimiento para registrar esta solicitud.');
 const message=text(body.message,1700),subject=text(body.subject,80);
 if(body.attachmentIds!==undefined&&(!Array.isArray(body.attachmentIds)||body.attachmentIds.length>3))fail('INVALID_INPUT','Hasta tres adjuntos.');
 const attachmentIds=(body.attachmentIds as unknown[]|undefined??[]).map(uuid);if(new Set(attachmentIds).size!==attachmentIds.length)fail('INVALID_INPUT','Adjunto duplicado.');
 return{kind:String(kind),message,subject,attachmentIds};
}
export async function receiveRequest(db:PoolClient,key:ApiKey,owner:string,action:string,body:Record<string,unknown>,requestHash:string,payloadHash:string){
 const input=receiptInput(action,body);await db.query('SELECT id FROM '+t('oc_client_user')+' WHERE id=$1 FOR UPDATE',[owner]);
 const old=(await db.query(`SELECT * FROM ${t('oc_client_cris_receipts')} WHERE key_id=$1 AND request_hash=$2`,[key.id,requestHash])).rows[0];
 if(old){if(old.customer_id!==owner||old.payload_hash!==payloadHash)fail('IDEMPOTENCY_CONFLICT','La clave ya fue usada con otros datos.',409);return{id:old.id,ticketId:old.ticket_id,state:'PENDING_REVIEW',replayed:true};}
 const attachmentRows=[];
 for(const id of input.attachmentIds){const row=(await db.query(`SELECT id FROM ${t('oc_client_cris_attachments')} WHERE id=$1 AND key_id=$2 AND customer_id=$3 AND ticket_id IS NULL AND expires_at>now() FOR UPDATE`,[id,key.id,owner])).rows[0];if(!row)fail('RESOURCE_NOT_FOUND','No encontramos el recurso solicitado.',404);attachmentRows.push(row);}
 const keyHash=digest(key.id+':'+requestHash);const ticketKey=`${keyHash.slice(0,8)}-${keyHash.slice(8,12)}-4${keyHash.slice(13,16)}-a${keyHash.slice(17,20)}-${keyHash.slice(20,32)}`;
 const ticketId=await createSupportTicketInTransaction(db,{kind:'customer',id:owner},{subject:`[Cris:${input.kind}] ${input.subject}`.slice(0,100),message:`PENDIENTE DE REVISIÓN HUMANA. No acredita pagos ni confirma reservas, créditos o convenios.\n\n${input.message}`.slice(0,2000),requestKey:ticketKey},false);
 for(const row of attachmentRows)await db.query(`UPDATE ${t('oc_client_cris_attachments')} SET ticket_id=$2 WHERE id=$1`,[row.id,ticketId]);
 const id=randomUUID();await db.query(`INSERT INTO ${t('oc_client_cris_receipts')}(id,key_id,request_hash,payload_hash,customer_id,ticket_id,kind) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,key.id,requestHash,payloadHash,owner,ticketId,input.kind]);
 return{id,ticketId,state:'PENDING_REVIEW',replayed:false};
}
export async function customerTickets(owner:string,body:Record<string,unknown>){
 if(body.ticketId!==undefined){const offset=body.messageOffset??0;if(!Number.isInteger(offset)||Number(offset)<0||Number(offset)>10000)fail('INVALID_INPUT','Offset no válido.');const detail=await getSupportTicket({kind:'customer',id:owner},uuid(body.ticketId),{offset:Number(offset),limit:51});return{ticket:{id:detail.id,folio:detail.folio,subject:detail.subject,status:detail.status,createdAt:detail.createdAt,updatedAt:detail.updatedAt,messages:detail.messages.slice(0,50)},nextMessageOffset:detail.messages.length>50?Number(offset)+50:null,pageSize:50};}
 const offset=body.offset??0;if(!Number.isInteger(offset)||Number(offset)<0||Number(offset)>10000)fail('INVALID_INPUT','Offset no válido.');
 const list=await listSupportTickets({kind:'customer',id:owner},{offset:Number(offset)});return{tickets:list.tickets,nextOffset:list.hasMore?Number(offset)+50:null,pageSize:50};
}
export async function customerRequests(owner:string,body:Record<string,unknown>){
 const offset=body.offset??0;if(!Number.isInteger(offset)||Number(offset)<0||Number(offset)>10000)fail('INVALID_INPUT','Offset no válido.');
 const id=body.requestId===undefined?null:uuid(body.requestId);
 const r=await clientPool().query(`SELECT r.id,r.ticket_id,r.kind,r.state,r.created_at,t.status AS ticket_status FROM ${t('oc_client_cris_receipts')} r JOIN ${t('oc_client_support_tickets')} t ON t.id=r.ticket_id WHERE r.customer_id=$1 AND ($2::uuid IS NULL OR r.id=$2) ORDER BY r.created_at DESC,r.id DESC LIMIT 21 OFFSET $3`,[owner,id,Number(offset)]);if(id&&!r.rows.length)fail('RESOURCE_NOT_FOUND','No encontramos el recurso solicitado.',404);
 return{requests:r.rows.slice(0,20).map(row=>({id:row.id,ticketId:row.ticket_id,kind:row.kind,receivedState:row.state,ticketStatus:row.ticket_status,createdAt:new Date(row.created_at).toISOString()})),nextOffset:r.rows.length>20?Number(offset)+20:null,pageSize:20};
}
export async function privateAttachment(id:string){const r=await clientPool().query(`SELECT a.* FROM ${t('oc_client_cris_attachments')} a JOIN ${t('oc_client_support_tickets')} t ON t.id=a.ticket_id AND t.customer_id=a.customer_id WHERE a.id=$1 AND a.expires_at>now()`,[uuid(id)]);const row=r.rows[0];if(!row)fail('RESOURCE_NOT_FOUND','No encontramos el recurso solicitado.',404);return{bytes:Buffer.from(revealClientValue(row.payload_enc,'cris-attachment'),'base64'),mime:row.mime};}
