import {privateJson} from "@/lib/clients/http";
import {kapsoVerificationEnabled,verifyKapsoSignature,kapsoVerificationMessages,acceptKapsoVerification,WhatsappVerificationError} from "@/lib/integrations/kapso-verification";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!kapsoVerificationEnabled())return privateJson({error:"Servicio no disponible."},503);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return privateJson({error:"Formato no válido."},415);
 if(!request.headers.get("x-webhook-signature"))return privateJson({error:"Firma no válida."},401);
 try{const reader=request.body?.getReader();if(!reader)return privateJson({error:"Solicitud vacía."},400);let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return privateJson({error:"Solicitud demasiado grande."},413);}chunks.push(value);}const raw=Buffer.concat(chunks);if(!verifyKapsoSignature(raw,request.headers.get("x-webhook-signature")))return privateJson({error:"Firma no válida."},401);
 if(request.headers.get("x-webhook-event")!=="whatsapp.message.received")return privateJson({ok:true});
 let body:unknown;try{body=JSON.parse(raw.toString("utf8"));}catch{return privateJson({error:"JSON no válido."},400);}
 for(const message of kapsoVerificationMessages(body))await acceptKapsoVerification(message);
 // Acknowledge without leaking account existence or verification state to event callers.
 return privateJson({ok:true});
 }catch(e){return privateJson({error:e instanceof WhatsappVerificationError?e.message:"No se pudo procesar el evento."},e instanceof WhatsappVerificationError?e.status:503);}
}
