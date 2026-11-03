import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { clientPool, clientTable as t } from './db';
import { protectClientValue, revealClientValue } from './privacy';
import { levelUpgradeEmailContent, type LevelUpgradeMail } from './level-email';
import { enviarConResend, type EnvioCorreo, type ResultadoEnvio } from '@/lib/mail/resend';
import { CONTACTO_EMAIL } from '@/lib/solicitudes/types';
export type LevelMailState='pending'|'processing'|'accepted'|'failed'|'unverified'|'cancelled'|'review';
export async function queueLevelUpgradeMail(db:Pick<PoolClient,'query'>,input:{changeId:string;customerId:string;previousCode:string;newCode:string}){
 const row=(await db.query(`SELECT u.email,u."firstName",u."emailVerified",before_tier.name AS previous_name,before_tier.position AS previous_position,after_tier.code,after_tier.name,after_tier.position,after_tier.max_percent,after_tier.max_amount,after_tier.max_installments,COALESCE(b.principal_outstanding,0) AS outstanding,clock_timestamp() AS changed_at FROM ${t('oc_client_user')} u JOIN ${t('oc_client_tiers')} after_tier ON after_tier.code=u.category JOIN ${t('oc_client_tiers')} before_tier ON before_tier.code=$2 LEFT JOIN ${t('oc_client_credit_balances')} b ON b.user_id=u.id WHERE u.id=$1 AND after_tier.code=$3 FOR SHARE OF before_tier,after_tier`,[input.customerId,input.previousCode,input.newCode])).rows[0];
 if(!row||Number(row.position)<=Number(row.previous_position))return false;
 const maxAmount=Number(row.max_amount),outstanding=Number(row.outstanding),verified=row.emailVerified===true;
 const payload:LevelUpgradeMail={to:String(row.email),firstName:String(row.firstName),previousName:String(row.previous_name),tier:{code:String(row.code),name:String(row.name),maxPercent:Number(row.max_percent),maxAmount,maxInstallments:Number(row.max_installments)},capacity:Math.max(0,maxAmount-outstanding),available:verified&&outstanding===0?maxAmount:0,outstanding,emailVerified:verified,changedAt:new Date(row.changed_at).toISOString()};
 await db.query(`INSERT INTO ${t('oc_client_level_mail')}(id,change_id,customer_id,payload_cipher,state) VALUES($1,$2,$3,$4,$5) ON CONFLICT(change_id) DO NOTHING`,[randomUUID(),input.changeId,input.customerId,protectClientValue(JSON.stringify(payload),'level-email'),verified?'pending':'unverified']);
 return true;
}
/** New mail never reaches real recipients from development, even if Resend credentials exist. */
export function levelMailEnabled(){return process.env.NODE_ENV==='production'&&process.env.CLIENT_LEVEL_MAIL_ENABLED==='true';}
export async function drainLevelUpgradeMail(scope:{customerId?:string}={},options:{transport?:(message:EnvioCorreo)=>Promise<ResultadoEnvio>}={}){
 if(!options.transport&&!levelMailEnabled())return {accepted:0,disabled:true};
 const pool=clientPool(),queue=t('oc_client_level_mail'),token=randomUUID();
 await pool.query(`UPDATE ${queue} SET state='review',failure_code='idempotency_expired',lease_until=NULL,lease_token=NULL WHERE state IN ('pending','processing','unverified') AND attempts>0 AND first_attempt_at<now()-interval '23 hours'`);
 const result=await pool.query(`WITH candidate AS(SELECT n.id,u.email,u."emailVerified" AS verified,u.category FROM ${queue} n JOIN ${t('oc_client_user')} u ON u.id=n.customer_id WHERE (n.state='pending' OR (n.state='processing' AND n.lease_until<now()) OR (n.state='unverified' AND u."emailVerified")) AND n.next_attempt_at<=now() AND ($1::text IS NULL OR n.customer_id=$1) ORDER BY n.created_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1) UPDATE ${queue} n SET state='processing',lease_token=$2,lease_until=now()+interval '2 minutes' FROM candidate c WHERE n.id=c.id RETURNING n.id,n.payload_cipher,n.attempts,c.email,c.verified,c.category`,[scope.customerId??null,token]);
 const job=result.rows[0];if(!job)return {accepted:0};
 let payload:LevelUpgradeMail;
 try{payload=JSON.parse(revealClientValue(job.payload_cipher,'level-email'));}
 catch{await pool.query(`UPDATE ${queue} SET state='review',failure_code='payload_invalid',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,token]);return {accepted:0};}
 if(!job.verified||job.email!==payload.to||job.category!==payload.tier.code){
  const state=job.email!==payload.to||job.category!==payload.tier.code?'cancelled':'unverified';
  await pool.query(`UPDATE ${queue} SET state=$3,failure_code=$4,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,token,state,state==='cancelled'?'recipient_or_level_changed':'unverified']);return {accepted:0};
 }
 if(Number(job.attempts)===0){
  const fresh=(await pool.query(`SELECT u.email,u."emailVerified",tier.code,tier.name,tier.max_percent,tier.max_amount,tier.max_installments,COALESCE(b.principal_outstanding,0) AS outstanding,clock_timestamp() AS as_of FROM ${t('oc_client_user')} u JOIN ${t('oc_client_tiers')} tier ON tier.code=u.category LEFT JOIN ${t('oc_client_credit_balances')} b ON b.user_id=u.id JOIN ${queue} n ON n.customer_id=u.id WHERE n.id=$1`,[job.id])).rows[0];
  if(!fresh||fresh.email!==payload.to||fresh.code!==payload.tier.code||!fresh.emailVerified){await pool.query(`UPDATE ${queue} SET state='cancelled',failure_code='recipient_or_level_changed',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,token]);return {accepted:0};}
  const outstanding=Number(fresh.outstanding),maximum=Number(fresh.max_amount);
  payload={...payload,tier:{code:String(fresh.code),name:String(fresh.name),maxAmount:maximum,maxPercent:Number(fresh.max_percent),maxInstallments:Number(fresh.max_installments)},outstanding,capacity:Math.max(0,maximum-outstanding),available:outstanding===0?maximum:0,emailVerified:true,changedAt:new Date(fresh.as_of).toISOString()};
  await pool.query(`UPDATE ${queue} SET payload_cipher=$3 WHERE id=$1 AND lease_token=$2`,[job.id,token,protectClientValue(JSON.stringify(payload),'level-email')]);
 }
 // The body remains immutable across retries with the same provider idempotency key.
 const content=levelUpgradeEmailContent(payload);
 const claimed=await pool.query(`UPDATE ${queue} SET attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()) WHERE id=$1 AND lease_token=$2 AND state='processing'`,[job.id,token]);
 if(!claimed.rowCount)return {accepted:0};
 const send=options.transport??enviarConResend;
 let response:ResultadoEnvio;
 try{response=await send({to:payload.to,subject:content.title,html:content.html,text:content.text,replyTo:CONTACTO_EMAIL,idempotencyKey:`level-upgrade-${job.id}`});}
 catch{response={ok:false,id:null,error:'Transport unavailable'};}
 if(response.ok&&response.id){
  await pool.query(`UPDATE ${queue} SET state='accepted',provider_id=$3,failure_code=NULL,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,token,response.id]);return {accepted:1};
 }
 const rejected=Boolean(response.httpStatus&&response.httpStatus>=400&&response.httpStatus<500&&response.httpStatus!==429);
 await pool.query(`UPDATE ${queue} SET state=$3,failure_code=$4,next_attempt_at=now()+interval '5 minutes',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,token,rejected?'failed':'pending',rejected?'provider_rejected':'retry_pending']);
 return {accepted:0};
}
