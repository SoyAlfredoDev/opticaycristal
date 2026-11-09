import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson,sameClientOrigin,readClientBody} from '@/lib/clients/http';
import {sendWhatsappOtp,confirmWhatsappOtp,whatsappOtpStatus,WhatsappVerificationError} from '@/lib/integrations/whatsapp-otp';
import {limitWhatsappStatus,whatsappRequestIp} from '@/lib/integrations/whatsapp-verification-limits';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const staff=await customerAdminSession(true);if(!staff)return privateJson({error:'Acceso restringido.'},401);
 if(!sameClientOrigin(request))return privateJson({error:'Origen no permitido.'},403);
 let raw;try{raw=await readClientBody(request,512);}catch{return privateJson({error:'Solicitud no válida.'},400);}
 const{id}=await params;
 if(!id||id.length>120||!raw||typeof raw!=='object'||Array.isArray(raw))return privateJson({error:'Solicitud no válida.'},400);
 const b=raw as Record<string,unknown>,ip=whatsappRequestIp(request);
 if(Object.keys(b).some(k=>!['action','requestId','code'].includes(k)))return privateJson({error:'Campos no permitidos.'},400);
 try{
  if(b.action==='status'){await limitWhatsappStatus(id,ip);return privateJson(await whatsappOtpStatus(id));}
  if(b.action==='send')return privateJson(await sendWhatsappOtp(id,ip));
  if(b.action==='confirm')return privateJson(await confirmWhatsappOtp(id,{requestId:b.requestId,code:b.code},ip,staff.u));
  return privateJson({error:'Acción no válida.'},400);
 }catch(e){const known=e instanceof WhatsappVerificationError;const r=privateJson({error:known?e.message:'No pudimos verificar el WhatsApp.'},known?e.status:503);if(known&&e.retryAfterSeconds)r.headers.set('Retry-After',String(e.retryAfterSeconds));return r;}
}
