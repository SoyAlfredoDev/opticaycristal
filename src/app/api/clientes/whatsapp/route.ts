import {customerSession} from "@/lib/clients/auth";
import {privateJson,sameClientOrigin,readClientBody} from "@/lib/clients/http";
import {WhatsappVerificationError,whatsappOtpStatus,sendWhatsappOtp} from "@/lib/integrations/whatsapp-otp";
import {limitWhatsappStatus,whatsappRequestIp} from "@/lib/integrations/whatsapp-verification-limits";
export const runtime="nodejs";
function failure(error:unknown,message:string){
  const response=privateJson({error:error instanceof WhatsappVerificationError?error.message:message},error instanceof WhatsappVerificationError?error.status:503);
  if(error instanceof WhatsappVerificationError&&error.retryAfterSeconds)response.headers.set("Retry-After",String(error.retryAfterSeconds));
  return response;
}
export async function GET(request:Request){
  try{
    const session=await customerSession();if(!session)return privateJson({error:"Inicia sesión."},401);
    await limitWhatsappStatus(session.user.id,whatsappRequestIp(request));
    return privateJson(await whatsappOtpStatus(session.user.id));
  }catch(error){return failure(error,"No pudimos consultar la verificación.");}
}
export async function POST(request:Request){
  try{
    const session=await customerSession();if(!session)return privateJson({error:"Inicia sesión."},401);
    if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
    let raw:unknown;try{raw=await readClientBody(request,256);}catch{return privateJson({error:"Solicitud no válida."},400);}
    if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).length)return privateJson({error:"No se admiten datos de otra cuenta."},400);
    return privateJson(await sendWhatsappOtp(session.user.id,whatsappRequestIp(request)));
  }catch(error){return failure(error,"No pudimos iniciar la verificación.");}
}
