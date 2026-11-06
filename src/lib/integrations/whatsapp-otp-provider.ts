import "server-only";
import {whatsappOtpConfigured} from './kapso-config';
export type OtpDelivery={accepted:boolean;id:string|null;uncertain:boolean};
export async function sendWhatsappOtpMessage(phone:string,code:string):Promise<OtpDelivery>{
 if(!whatsappOtpConfigured()||!/^\+[1-9]\d{7,14}$/.test(phone)||!/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{4}$/.test(code))throw Error('Configuración de verificación no disponible.');
 // Meta stores the approved COPY_CODE authentication button as URL.
 // Match the real template returned by Kapso, not its creation-time OTP type.
 // Exactly one request. A timeout is not permission to send a second message.
 try{
  const response=await fetch(`https://api.kapso.ai/meta/whatsapp/v24.0/${process.env.KAPSO_PHONE_NUMBER_ID}/messages`,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'X-API-Key':process.env.KAPSO_API_KEY!,'Content-Type':'application/json'},
   body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:phone.slice(1),type:'template',template:{name:process.env.KAPSO_OTP_TEMPLATE_NAME,language:{code:process.env.KAPSO_OTP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]}})
  });
  // Never return provider messages, which can contain a phone number or payload.
  if(!response.ok)return{accepted:false,id:null,uncertain:response.status>=500||response.status===429};
  const body=await response.json().catch(()=>null) as {messages?:Array<{id?:unknown}>}|null;
  const id=body?.messages?.[0]?.id;
  return typeof id==='string'&&id.length>0&&id.length<=300?{accepted:true,id,uncertain:false}:{accepted:false,id:null,uncertain:true};
 }catch{return{accepted:false,id:null,uncertain:true};}
}
