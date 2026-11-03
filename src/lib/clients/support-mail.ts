import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { enviarConResend, resendConfigured, type EnvioCorreo } from "@/lib/mail/resend";
import { clientPool, clientTable } from "./db";
import { protectClientValue, revealClientValue } from "./privacy";
import { supportEmailContent, type SupportMailKind } from "./support-email";
const queue=()=>clientTable("oc_client_support_mail");
export async function queueSupportMail(db:PoolClient,{ticketId,messageId,kind}:{ticketId:string;messageId:string;kind:SupportMailKind}) {
 const person=await db.query<{folio:string;email:string;emailVerified:boolean}>(`SELECT t.folio,u.email,u."emailVerified" FROM ${clientTable("oc_client_support_tickets")} t JOIN ${clientTable("oc_client_user")} u ON u.id=t.customer_id WHERE t.id=$1`,[ticketId]);
 const row=person.rows[0];
 const to=kind==="ticket_created"?(process.env.CLIENT_SUPPORT_EMAIL?.trim()||"opticaycristal.cl@gmail.com"):row.email;
 const payload={to,...supportEmailContent({kind,ticketId,folio:`AYU-${String(row.folio).padStart(5,"0")}`})};
 await db.query(`INSERT INTO ${queue()}(id,ticket_id,message_id,kind,payload_cipher,state) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(message_id) DO NOTHING`,[randomUUID(),ticketId,messageId,kind,protectClientValue(JSON.stringify(payload),"support-email"),"pending"]);
}
export type MailScope={ticketId?:string;customerId?:string;requestKey?:string};
type Job={id:string;payload_cipher:string;lease_token:string;attempts:number;kind:SupportMailKind;email:string;email_verified:boolean};
async function claim(scope:MailScope):Promise<Job|undefined> {
 const token=randomUUID();
 // An uncertain send is never retried outside the provider's 24-hour idempotency window.
 await clientPool().query(`UPDATE ${queue()} SET state='failed',failure_code='review_required',lease_token=NULL,lease_until=NULL WHERE state IN ('pending','processing','unverified') AND attempts>0 AND first_attempt_at<now()-interval '22 hours' AND (lease_until IS NULL OR lease_until<now())`);
 const result=await clientPool().query<Job>(`WITH candidate AS (SELECT n.id,u.email,u."emailVerified" AS email_verified FROM ${queue()} n JOIN ${clientTable("oc_client_support_tickets")} t ON t.id=n.ticket_id JOIN ${clientTable("oc_client_user")} u ON u.id=t.customer_id JOIN ${clientTable("oc_client_support_messages")} m ON m.id=n.message_id WHERE (n.state='pending' OR(n.state='processing' AND n.lease_until<now()) OR n.state='unverified') AND n.next_attempt_at<=now() AND ($1::uuid IS NULL OR n.ticket_id=$1) AND ($2::text IS NULL OR t.customer_id=$2) AND ($3::uuid IS NULL OR m.request_key=$3) ORDER BY n.created_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1) UPDATE ${queue()} n SET state='processing',lease_until=now()+interval '2 minutes',lease_token=$4,first_attempt_at=CASE WHEN n.attempts=0 THEN now() ELSE COALESCE(n.first_attempt_at,now()) END FROM candidate c WHERE n.id=c.id RETURNING n.id,n.payload_cipher,n.lease_token,n.attempts,n.kind,c.email,c.email_verified`,[scope.ticketId||null,scope.customerId||null,scope.requestKey||null,token]);
 return result.rows[0];
}
export async function drainSupportMail(scope:MailScope={},options:{maxAttempts?:number;delay?:(ms:number)=>Promise<void>}={}) {
 if(!resendConfigured())return {sent:0};
 const job=await claim(scope);if(!job)return {sent:0};
 const delay=options.delay||((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
 const payload=JSON.parse(revealClientValue(job.payload_cipher,"support-email")) as EnvioCorreo;
 if(job.kind==="staff_reply"&&(payload.to!==job.email)){
  await clientPool().query(`UPDATE ${queue()} SET state=$3,failure_code=$4,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2`,[job.id,job.lease_token,"failed","address_changed"]);return {sent:0};
 }
 for(let attempt=0;attempt<(options.maxAttempts??3);attempt++){
  const lease=await clientPool().query(`UPDATE ${queue()} SET attempts=attempts+1,lease_until=now()+interval '2 minutes' WHERE id=$1 AND lease_token=$2 AND state='processing'`,[job.id,job.lease_token]);
  if(!lease.rowCount)return {sent:0};
  const result=await enviarConResend({...payload,idempotencyKey:`support-mail-${job.id}`});
  if(result.ok){
   await clientPool().query(`UPDATE ${queue()} SET state='sent',provider_id=$3,failure_code=NULL,lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2`,[job.id,job.lease_token,result.id]);
   return {sent:1};
  }
  if(result.httpStatus&&result.httpStatus>=400&&result.httpStatus<500&&result.httpStatus!==429){
   await clientPool().query(`UPDATE ${queue()} SET state='failed',failure_code='provider_rejected',lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2`,[job.id,job.lease_token]);return {sent:0};
  }
  if(attempt+1<(options.maxAttempts??3))await delay(1000*(attempt+1));
 }
 await clientPool().query(`UPDATE ${queue()} SET state='pending',next_attempt_at=now()+interval '5 minutes',failure_code='retry_pending',lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2`,[job.id,job.lease_token]);
 return {sent:0};
}
