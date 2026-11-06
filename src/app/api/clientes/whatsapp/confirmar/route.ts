import {customerSession} from '@/lib/clients/auth';
import {privateJson,sameClientOrigin,readClientBody} from '@/lib/clients/http';
import {confirmWhatsappOtp,WhatsappVerificationError} from '@/lib/integrations/whatsapp-otp';
import {whatsappRequestIp} from '@/lib/integrations/whatsapp-verification-limits';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const session=await customerSession();if(!session)return privateJson({error:'Inicia sesión.'},401);
  if(!sameClientOrigin(request))return privateJson({error:'Origen no permitido.'},403);
  let raw:unknown;try{raw=await readClientBody(request,256);}catch{return privateJson({error:'Solicitud no válida.'},400);}
  return privateJson(await confirmWhatsappOtp(session.user.id,raw,whatsappRequestIp(request)));
 }catch(error){
  const known=error instanceof WhatsappVerificationError;
  const response=privateJson({error:known?error.message:'No pudimos validar el código.'},known?error.status:503);
  if(known&&error.retryAfterSeconds)response.headers.set('Retry-After',String(error.retryAfterSeconds));
  return response;
 }
}
