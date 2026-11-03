import {randomUUID} from "node:crypto";
import {privateJson,readClientBody} from "@/lib/clients/http";
import {IntegrationError,integrationKey,limitIntegration,parseIntegrationContact,queryWhatsappCustomer,queryWhatsappConditions,integrationAudit} from "@/lib/integrations/whatsapp";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const requestId=randomUUID();let keyId="",action="";
 const reply=(body:unknown,status=200)=>{const response=privateJson(body,status);response.headers.set("X-Request-ID",requestId);response.headers.set("X-Robots-Tag","noindex, nofollow");if(status===401)response.headers.set("WWW-Authenticate",'Bearer realm="whatsapp-integration"');if(status===429)response.headers.set("Retry-After","900");return response;};
 try{
  action=(await params).action;
  if(!["consultar-credito","validar-whatsapp","consultar-condiciones"].includes(action))return reply({error:{code:"NOT_FOUND",message:"Acción no disponible."},requestId},404);
  keyId=integrationKey(request);
  if(request.headers.has("origin"))throw new IntegrationError("SERVER_ONLY","Esta API es solo para conexiones entre servidores.",403);
  if(process.env.NODE_ENV==="production"&&new URL(request.url).protocol!=="https:")throw new IntegrationError("HTTPS_REQUIRED","Se requiere HTTPS.",400);
  await limitIntegration(keyId);
  let raw:unknown;try{raw=await readClientBody(request,2048);}catch{throw new IntegrationError("INVALID_INPUT","Envía JSON válido de hasta 2 KB.");}
  let data:unknown;
  if(action==="consultar-condiciones"){
   if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).length)throw new IntegrationError("INVALID_INPUT","Esta consulta no admite datos personales.");
   data=await queryWhatsappConditions();
  }else{
   const contact=parseIntegrationContact(raw);await limitIntegration(keyId,contact);
   data=await queryWhatsappCustomer(contact,action as "consultar-credito"|"validar-whatsapp");
  }
  await integrationAudit(requestId,keyId,action,"ok");
  return reply({data,requestId,queriedAt:new Date().toISOString()});
 }catch(error){
  const known=error instanceof IntegrationError;
  if(keyId)try{await integrationAudit(requestId,keyId,action,known?error.code:"UNAVAILABLE");}catch{/* Fail closed below; never log private request data. */}
  return reply({error:{code:known?error.code:"UNAVAILABLE",message:known?error.message:"La consulta no está disponible temporalmente."},requestId},known?error.status:503);
 }
}
