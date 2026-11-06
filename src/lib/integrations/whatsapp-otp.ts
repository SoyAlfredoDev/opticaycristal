import 'server-only';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {clientPool,clientTable as t} from '@/lib/clients/db';
import {clientFingerprint,revealClientValue} from '@/lib/clients/privacy';
import {normalizeIntegrationWhatsapp} from './whatsapp-number';
import {whatsappOtpConfigured} from './kapso-config';
import {limitWhatsappIssue,limitWhatsappConfirmation,WhatsappVerificationError} from './whatsapp-verification-limits';
import {sendWhatsappOtpMessage} from './whatsapp-otp-provider';
import {generateWhatsappOtp,normalizeWhatsappOtp} from './whatsapp-otp-code';
export {WhatsappVerificationError} from './whatsapp-verification-limits';
const phoneHash=(phone:string)=>clientFingerprint(phone,'whatsapp-verification-phone');
const codeHash=(code:string,id:string,user:string,phone:string)=>clientFingerprint(code,`whatsapp-otp:${id}:${user}:${phone}`);
export async function whatsappOtpStatus(userId:string){
 const user=(await clientPool().query(`SELECT "whatsappVerified" FROM ${t('oc_client_user')} WHERE id=$1`,[userId])).rows[0];
 if(!user)throw new WhatsappVerificationError('Cuenta no encontrada.',404);
 const available=whatsappOtpConfigured();
 if(!available||user.whatsappVerified)return{available,verified:user.whatsappVerified===true,pending:null};
 const saved=(await clientPool().query(`SELECT request_id,expires_at,GREATEST(0,ceil(extract(epoch from resend_at-now())))::int AS retry FROM ${t('oc_client_whatsapp_otps')} WHERE user_id=$1 AND state='sent' AND code_hash IS NOT NULL AND expires_at>now() AND consumed_at IS NULL AND cancelled_at IS NULL AND attempts<5`,[userId])).rows[0];
 return{available,verified:false,pending:saved?{requestId:saved.request_id,expiresAt:new Date(saved.expires_at).toISOString(),resendAfterSeconds:saved.retry}:null};
}
export async function sendWhatsappOtp(userId:string,ip:string){
 if(!whatsappOtpConfigured())throw new WhatsappVerificationError('El envío de códigos por WhatsApp no está disponible en este momento.',503);
 const db=await clientPool().connect(),requestId=randomUUID(),code=generateWhatsappOtp();
 let phone='',expiresAt='';
 try{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='2s'");await db.query("SET LOCAL statement_timeout='4s'");
  const user=(await db.query(`SELECT "whatsappCipher","whatsappVerified" FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`,[userId])).rows[0];
  if(!user)throw new WhatsappVerificationError('Cuenta no encontrada.',404);
  if(user.whatsappVerified){await db.query('COMMIT');return{verified:true};}
  phone=normalizeIntegrationWhatsapp(revealClientValue(user.whatsappCipher,'whatsapp'));
  const previous=(await db.query(`SELECT GREATEST(0,ceil(extract(epoch from resend_at-now())))::int AS retry FROM ${t('oc_client_whatsapp_otps')} WHERE user_id=$1 FOR UPDATE`,[userId])).rows[0];
  if(previous?.retry>0)throw new WhatsappVerificationError('Espera antes de enviar otro código.',429,Number(previous.retry));
  const hash=phoneHash(phone);await limitWhatsappIssue(db,userId,hash,ip);
  const saved=await db.query(`INSERT INTO ${t('oc_client_whatsapp_otps')}(user_id,request_id,phone_hash,code_hash,state,expires_at,resend_at) VALUES($1,$2,$3,$4,'sending',now()+interval '5 minutes',now()+interval '60 seconds') ON CONFLICT(user_id) DO UPDATE SET request_id=EXCLUDED.request_id,phone_hash=EXCLUDED.phone_hash,code_hash=EXCLUDED.code_hash,state='sending',issued_at=now(),expires_at=EXCLUDED.expires_at,resend_at=EXCLUDED.resend_at,attempts=0,consumed_at=NULL,cancelled_at=NULL,provider_id=NULL RETURNING expires_at`,[userId,requestId,hash,codeHash(code,requestId,userId,hash)]);
  expiresAt=new Date(saved.rows[0].expires_at).toISOString();
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 // The counter and reservation commit BEFORE calling the provider, including
 // failed/uncertain sends. Repeating a request cannot reset the send budget.
 let result;
 try{result=await sendWhatsappOtpMessage(phone,code);}catch{result={accepted:false,id:null,uncertain:true};}
 const saved=await clientPool().query(`UPDATE ${t('oc_client_whatsapp_otps')} SET state=$3,provider_id=$4,code_hash=CASE WHEN $3='sent' THEN code_hash ELSE NULL END WHERE user_id=$1 AND request_id=$2 AND cancelled_at IS NULL AND consumed_at IS NULL AND expires_at>now() RETURNING request_id`,[userId,requestId,result.accepted?'sent':result.uncertain?'uncertain':'failed',result.id]);
 if(!result.accepted||!saved.rows.length)throw new WhatsappVerificationError('No pudimos confirmar el envío. Espera un minuto antes de intentarlo otra vez.',503,60);
 return{verified:false,requestId,expiresAt,resendAfterSeconds:60};
}
export async function confirmWhatsappOtp(userId:string,raw:unknown,ip:string){
 if(!whatsappOtpConfigured())throw new WhatsappVerificationError('La verificación no está disponible en este momento.',503);
 await limitWhatsappConfirmation(userId,ip);
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['requestId','code'].includes(k)))throw new WhatsappVerificationError('Solicitud no válida.');
 const b=raw as Record<string,unknown>,code=normalizeWhatsappOtp((raw as Record<string,unknown>).code);
 if(typeof b.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(b.requestId)||!code)throw new WhatsappVerificationError('Ingresa los cuatro caracteres del código.');
 const db=await clientPool().connect();let failure='';
 try{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='2s'");await db.query("SET LOCAL statement_timeout='4s'");
  const user=(await db.query(`SELECT "whatsappCipher","whatsappVerified" FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`,[userId])).rows[0];
  const saved=(await db.query(`SELECT *,expires_at>now() AS live FROM ${t('oc_client_whatsapp_otps')} WHERE user_id=$1 FOR UPDATE`,[userId])).rows[0];
  const hash=user?phoneHash(normalizeIntegrationWhatsapp(revealClientValue(user.whatsappCipher,'whatsapp'))):'';
  if(user?.whatsappVerified&&saved?.consumed_at&&saved.request_id===b.requestId&&saved.phone_hash===hash){await db.query('COMMIT');return{verified:true};}
  if(!user||!saved||saved.request_id!==b.requestId||saved.phone_hash!==hash||!saved.live||saved.cancelled_at||saved.consumed_at||saved.state!=='sent'||!saved.code_hash||saved.attempts>=5)failure='El código venció o ya no está disponible. Solicita uno nuevo.';
  else if(!timingSafeEqual(Buffer.from(codeHash(code,b.requestId,userId,hash),'hex'),Buffer.from(saved.code_hash,'hex'))){
   await db.query(`UPDATE ${t('oc_client_whatsapp_otps')} SET attempts=attempts+1,code_hash=CASE WHEN attempts+1>=5 THEN NULL ELSE code_hash END WHERE user_id=$1`,[userId]);failure=saved.attempts>=4?'Se agotaron los intentos. Solicita un código nuevo.':'Código incorrecto. Revisa los cuatro caracteres recibidos.';
  }else{
   await db.query(`UPDATE ${t('oc_client_user')} SET "whatsappVerified"=true,"updatedAt"=now() WHERE id=$1`,[userId]);
   await db.query(`UPDATE ${t('oc_client_whatsapp_otps')} SET code_hash=NULL,consumed_at=now() WHERE user_id=$1`,[userId]);
   await db.query(`INSERT INTO ${t('oc_client_whatsapp_receipts')}(message_hash,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[clientFingerprint(b.requestId,'whatsapp-otp-receipt'),userId]);
  }
  // Failed attempts MUST persist. Rolling them back permits unlimited guesses.
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 if(failure)throw new WhatsappVerificationError(failure,400);
 return{verified:true};
}
