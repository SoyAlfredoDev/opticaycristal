import {randomUUID} from 'node:crypto';
import {clientPool,clientTable} from '@/lib/clients/db';
import {privateJson} from '@/lib/clients/http';
import {IntegrationError,limitIntegration,whatsappCustomerResult} from '@/lib/integrations/whatsapp';
import {SupportError} from '@/lib/clients/support';
import {InvalidHistoryCursor} from '@/lib/clients/private-read';
import {authenticate,digest,fail,object,owner,lockOwner,verifySenderEnvelope,type Scope} from '@/lib/integrations/cris/security';
import {commercialInformation} from '@/lib/integrations/cris/commercial';
import {financeSummary,installments,balance,payments} from '@/lib/integrations/cris/finance';
import {transaction,idempotency,receiveAttachment,receiveRequest,customerTickets,customerRequests} from '@/lib/integrations/cris/receipts';
export const runtime='nodejs';
export const maxDuration=30;
const actions:Record<string,{scope:Scope;fields:string[];write?:boolean}>={
 'consultar-credito':{scope:'finance:read',fields:[]},
 'validar-whatsapp':{scope:'finance:read',fields:[]},
 'consultar-resumen':{scope:'finance:read',fields:[]},
 'consultar-cuotas':{scope:'finance:read',fields:['cursor']},
 'consultar-saldo':{scope:'finance:read',fields:['saleId']},
 'consultar-pagos':{scope:'finance:read',fields:['saleId','cursor']},
 'consultar-ot':{scope:'orders:read',fields:[]},
 'consultar-comercial':{scope:'commercial:read',fields:[]},
 'consultar-tickets':{scope:'tickets:read',fields:['ticketId','offset','messageOffset']},
 'consultar-solicitudes':{scope:'requests:read',fields:['requestId','offset']},
 'crear-ticket':{scope:'tickets:write',write:true,fields:['subject','message','consent','attachmentIds']},
 'registrar-solicitud':{scope:'requests:write',write:true,fields:['kind','subject','message','consent','attachmentIds']},
 'avisar-comprobante':{scope:'requests:write',write:true,fields:['subject','message','consent','attachmentIds']},
 'recibir-adjunto':{scope:'attachments:write',write:true,fields:['mime','contentBase64']},
};
async function rawBody(request:Request,max:number){
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))fail('UNSUPPORTED_MEDIA_TYPE','Usa application/json.',415);
 const reader=request.body?.getReader();if(!reader)fail('INVALID_INPUT','JSON requerido.');let size=0;const chunks:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max){await reader.cancel();fail('PAYLOAD_TOO_LARGE','Solicitud demasiado grande.',413);}chunks.push(part.value);}return Buffer.concat(chunks);
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const start=performance.now(),requestId=randomUUID();let keyId='',action='';
 const audit=async(outcome:string,status:number)=>clientPool().query(`INSERT INTO ${clientTable('oc_client_integration_events')}(id,key_id,action,outcome,http_status,duration_ms) VALUES($1,$2,$3,$4,$5,$6)`,[requestId,keyId,action,outcome,status,Math.round(performance.now()-start)]);
 const reply=(payload:unknown,status=200)=>{const r=privateJson(payload,status);r.headers.set('X-Request-ID',requestId);r.headers.set('Server-Timing',`cris;dur=${Math.round(performance.now()-start)}`);r.headers.set('X-Robots-Tag','noindex, nofollow');if(status===429)r.headers.set('Retry-After','900');if(status===401)r.headers.set('WWW-Authenticate','Bearer realm="cris-integration"');return r;};
 try{
 action=(await params).action;const definition=actions[action];if(!definition)fail('NOT_FOUND','Acción no disponible.',404);
 const key=authenticate(request,definition.scope);keyId=key.id;await limitIntegration('cris:'+keyId);
 const raw=await rawBody(request,action==='recibir-adjunto'?1450000:8192);
 if(action!=='consultar-comercial')await verifySenderEnvelope(request,raw,key);
 let parsed:unknown;try{parsed=JSON.parse(raw.toString('utf8'));}catch{fail('INVALID_INPUT','JSON no válido.');}
 const body=object(parsed,action==='consultar-comercial'?[]:['document','sender',...definition.fields]);
 const person=action==='consultar-comercial'?null:await owner(body,'cris:'+keyId);
 let data:unknown;
 if(definition.write){
  const requestHash=idempotency(request),payloadHash=digest(action+'\n'+raw.toString('utf8'));
  data=await transaction(async db=>{await lockOwner(db,person!.customer.id,person!.contact);const result=action==='recibir-adjunto'?await receiveAttachment(db,key,person!.customer.id,body,requestHash,payloadHash):await receiveRequest(db,key,person!.customer.id,action,body,requestHash,payloadHash);await db.query(`INSERT INTO ${clientTable('oc_client_integration_events')}(id,key_id,action,outcome,http_status,duration_ms) VALUES($1,$2,$3,'ok',$4,$5)`,[requestId,keyId,action,result.replayed?200:201,Math.round(performance.now()-start)]);return result;});
 }else{
  switch(action){
   case 'consultar-comercial':data=commercialInformation();break;
   case 'consultar-credito':case 'validar-whatsapp':data=whatsappCustomerResult(person!.customer,action);break;
   case 'consultar-resumen':data=await financeSummary(person!.customer);break;
   case 'consultar-cuotas':data=await installments(person!.customer.id,body);break;
   case 'consultar-saldo':data=await balance(person!.customer.id,body);break;
   case 'consultar-pagos':data=await payments(person!.customer.id,body);break;
   case 'consultar-tickets':data=await customerTickets(person!.customer.id,body);break;
   case 'consultar-solicitudes':data=await customerRequests(person!.customer.id,body);break;
   case 'consultar-ot':fail('SOURCE_NOT_CONFIGURED','No hay una fuente de órdenes de fabricación vinculada. Requiere revisión humana.',503);
  }
  await audit('ok',200);
 }
 return reply({data,requestId,queriedAt:new Date().toISOString(),apiVersion:'1.1'},definition.write&&(data as {replayed:boolean}).replayed===false?201:200);
 }catch(error){
  const known=error instanceof IntegrationError;const support=error instanceof SupportError;
  const status=known?error.status:support?error.status:error instanceof InvalidHistoryCursor?400:503;
  const code=known?error.code:support?(status===404?'RESOURCE_NOT_FOUND':status===429?'RATE_LIMITED':status===409?'IDEMPOTENCY_CONFLICT':'INVALID_INPUT'):status===400?'INVALID_CURSOR':'UNAVAILABLE';
  if(keyId)try{await audit(code,status);}catch{}
  return reply({error:{code,message:known?error.message:support?'No se pudo procesar la solicitud.':status===400?'Cursor no válido.':'Servicio temporalmente no disponible.'},requestId},status);
 }
}
