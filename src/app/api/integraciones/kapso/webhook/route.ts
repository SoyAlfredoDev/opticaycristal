import {privateJson} from "@/lib/clients/http";
import {kapsoVerificationEnabled,verifyKapsoSignature} from "@/lib/integrations/kapso-config";
import {WhatsappVerificationError} from "@/lib/integrations/whatsapp-verification-limits";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!kapsoVerificationEnabled())return privateJson({error:"Servicio no disponible."},503);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return privateJson({error:"Formato no válido."},415);
 if(!/^[a-f0-9]{64}$/i.test(request.headers.get("x-webhook-signature")||""))return privateJson({error:"Firma no válida."},401);
 if(Number(request.headers.get("content-length")||0)>65536)return privateJson({error:"Solicitud demasiado grande."},413);
 const version=request.headers.get("x-webhook-payload-version");
 if(version&&version!=="v2")return privateJson({error:"Versión no admitida."},400);
 try{const reader=request.body?.getReader();if(!reader)return privateJson({error:"Solicitud vacía."},400);let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return privateJson({error:"Solicitud demasiado grande."},413);}chunks.push(value);}const raw=Buffer.concat(chunks);if(!verifyKapsoSignature(raw,request.headers.get("x-webhook-signature")))return privateJson({error:"Firma no válida."},401);
 if(request.headers.get("x-webhook-event")!=="whatsapp.message.received")return privateJson({ok:true});
 let body:unknown;try{body=JSON.parse(raw.toString("utf8"));}catch{return privateJson({error:"JSON no válido."},400);}
 void body; // Legacy receiver is acknowledgement-only. Inbound messages never verify accounts.
 // Acknowledge without leaking account existence or verification state to event callers.
 return privateJson({ok:true});
 }catch(e){return privateJson({error:e instanceof WhatsappVerificationError?e.message:"No se pudo procesar el evento."},e instanceof WhatsappVerificationError?e.status:503);}
}
