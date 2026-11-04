import "server-only";
import {createHash,randomBytes,createHmac} from "node:crypto";
import type {PoolClient} from "pg";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import {clientFingerprint,protectClientValue,revealClientValue} from "@/lib/clients/privacy";
import {normalizeClientRut,validClientRut} from "@/lib/clients/validation";
import {staffAuth,staffOrigin} from "./auth";
import {staffRegistration} from "./registration-context";
import {sendStaffInvitation} from "./mail";
export class StaffError extends Error{constructor(message:string,public status=400){super(message);}}
export type StaffActor={u:string;staffId?:string};
export type StaffUser={id:string;name:string;email:string;rut:string;role:"administrator"|"seller";status:"active"|"suspended";createdAt:string};
export type StaffInvite={id:string;email:string;rut:string;role:"administrator"|"seller";status:"pending"|"accepted"|"cancelled"|"expired";expiresAt:string;createdAt:string;mailStatus:"pending"|"accepted"|"failed"};
export function prettyStaffRut(value:string){return `${value.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,".")}-${value.slice(-1)}`;}
export function parseStaffInvitation(raw:Record<string,unknown>){
 const email=typeof raw.email==="string"?raw.email.trim().toLowerCase():"",rut=normalizeClientRut(typeof raw.rut==="string"?raw.rut:"");
 if(email.length>254||!/^[_a-z0-9+%'-]+(?:\.[_a-z0-9+%'-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(email))throw new StaffError("Ingresa un correo válido.");
 if(!validClientRut(rut))throw new StaffError("Revisa el RUT y su dígito verificador.");
 if(raw.role!=="administrator"&&raw.role!=="seller")throw new StaffError("Selecciona un rol válido.");
 if(typeof raw.requestKey!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.requestKey))throw new StaffError("Identificador de invitación no válido.");
 return{email,rut,role:raw.role,requestKey:raw.requestKey};
}
function mapInvite(row:Record<string,unknown>):StaffInvite{return{id:String(row.id),email:String(row.email),rut:prettyStaffRut(revealClientValue(String(row.rut_enc),"staff-rut")),role:row.role as StaffInvite["role"],status:row.status==="pending"&&new Date(String(row.expires_at)).getTime()<=Date.now()?"expired":row.status as StaffInvite["status"],expiresAt:new Date(String(row.expires_at)).toISOString(),createdAt:new Date(String(row.created_at)).toISOString(),mailStatus:row.mail_status as StaffInvite["mailStatus"]};}
async function transaction<T>(work:(db:PoolClient)=>Promise<T>){const db=await clientPool().connect();try{await db.query("BEGIN");const result=await work(db);await db.query("COMMIT");return result;}catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}}
async function liveActor(db:PoolClient,actor:StaffActor){if(!actor.u)throw new StaffError("Inicia sesión.",401);if(actor.staffId){const r=await db.query(`SELECT id FROM ${t("oc_client_staff_user")} WHERE id=$1 AND status='active' AND role='administrator' FOR SHARE`,[actor.staffId]);if(!r.rows[0])throw new StaffError("La sesión no tiene autorización.",403);}}
export async function listStaffUsers(){
 const [users,invites]=await Promise.all([clientPool().query(`SELECT id,name,email,"rutCipher",role,status,"createdAt" FROM ${t("oc_client_staff_user")} ORDER BY name,email`),clientPool().query(`SELECT id,email,rut_enc,role,status,expires_at,created_at,mail_status FROM ${t("oc_client_staff_invites")} ORDER BY created_at DESC LIMIT 100`)]);
 return{users:users.rows.map(row=>({id:row.id,name:row.name,email:row.email,rut:prettyStaffRut(revealClientValue(row.rutCipher,"staff-rut")),role:row.role as StaffUser["role"],status:row.status,createdAt:new Date(row.createdAt).toISOString()})) as StaffUser[],invites:invites.rows.map(mapInvite),legacyUsers:[process.env.ADMIN_USER,process.env.ADMIN_USER_2].filter((v):v is string=>Boolean(v?.trim())).map(v=>({login:v.trim(),role:"administrator" as const})),development:new URL(staffOrigin()).protocol==="http:"};
}
export async function inviteStaffUser(raw:Record<string,unknown>,actor:StaffActor,send=sendStaffInvitation){
 const input=parseStaffInvitation(raw),rutHash=clientFingerprint(input.rut,"staff-rut"),token=randomBytes(32).toString("hex"),hash=createHash("sha256").update(token).digest("hex");
 const pending=await transaction(async db=>{
  await db.query("SELECT pg_advisory_xact_lock(hashtext('oc-staff-invitations'))");await liveActor(db,actor);
  const previous=await db.query(`SELECT * FROM ${t("oc_client_staff_invites")} WHERE id=$1`,[input.requestKey]);
  if(previous.rows[0]){if(previous.rows[0].email!==input.email||previous.rows[0].rut_hash!==rutHash)throw new StaffError("La solicitud ya fue usada con otros datos.",409);return{row:previous.rows[0],created:false};}
  if([process.env.ADMIN_USER,process.env.ADMIN_USER_2].some(v=>v?.trim().toLowerCase()===input.email))throw new StaffError("Ese correo ya tiene un acceso configurado en el servidor. Se conserva su cuenta actual.",409);
  const exists=await db.query(`SELECT id FROM ${t("oc_client_staff_user")} WHERE email=$1 OR "rutHash"=$2 LIMIT 1`,[input.email,rutHash]);if(exists.rows[0])throw new StaffError("Ya existe un usuario con ese correo o RUT.",409);
  const recent=await db.query(`SELECT count(*)::int AS n,COALESCE(bool_or(created_at>now()-interval '60 seconds'),false) AS cooldown FROM ${t("oc_client_staff_invites")} WHERE (email=$1 OR rut_hash=$2) AND created_at>now()-interval '1 hour'`,[input.email,rutHash]);
  if(recent.rows[0]?.cooldown||Number(recent.rows[0]?.n)>=3)throw new StaffError("Espera antes de volver a invitar. Se permiten hasta tres invitaciones por hora para una persona.",429);
  await db.query(`UPDATE ${t("oc_client_staff_invites")} SET status='cancelled',cancelled_at=now(),cancelled_by=$3 WHERE (email=$1 OR rut_hash=$2) AND status='pending'`,[input.email,rutHash,actor.u]);
  const r=await db.query(`INSERT INTO ${t("oc_client_staff_invites")}(id,email,rut_enc,rut_hash,role,token_hash,created_by) VALUES($1,$2,$3,$4,$7,$5,$6) RETURNING *`,[input.requestKey,input.email,protectClientValue(input.rut,"staff-rut"),rutHash,hash,actor.u,input.role]);
  await db.query(`INSERT INTO ${t("oc_client_staff_events")}(actor,kind,entity_id) VALUES($1,'invitation_created',$2)`,[actor.u,input.requestKey]);return{row:r.rows[0],created:true};
 });
 if(!pending.created)return mapInvite(pending.row);
 // The secret is never stored or returned to the administrator. Only the recipient gets it.
 const url=`${staffOrigin()}/admin/registro#token=${token}`;
 let result:Awaited<ReturnType<typeof sendStaffInvitation>>;try{result=await send(input.email,url,input.requestKey);}catch{result={ok:false,id:null,error:"transport"};}
 const mail=await clientPool().query(`UPDATE ${t("oc_client_staff_invites")} SET mail_status=$2,mail_id=$3,mail_error=$4,mail_updated_at=now() WHERE id=$1 RETURNING *`,[input.requestKey,result.ok&&result.id?"accepted":"failed",result.id??null,result.ok&&result.id?null:"delivery_unconfirmed"]);
 return mapInvite(mail.rows[0]);
}
export async function cancelStaffInvitation(id:unknown,actor:StaffActor){if(typeof id!=="string"||id.length>120)throw new StaffError("Invitación no válida.");await transaction(async db=>{await db.query("SELECT pg_advisory_xact_lock(hashtext('oc-staff-invitations'))");await liveActor(db,actor);const r=await db.query(`UPDATE ${t("oc_client_staff_invites")} SET status='cancelled',cancelled_at=now(),cancelled_by=$2 WHERE id=$1 AND status='pending' RETURNING id`,[id,actor.u]);if(!r.rows[0])throw new StaffError("La invitación ya no está pendiente.");await db.query(`INSERT INTO ${t("oc_client_staff_events")}(actor,kind,entity_id) VALUES($1,'invitation_cancelled',$2)`,[actor.u,id]);});}
export async function changeStaffStatus(id:unknown,status:unknown,actor:StaffActor){if(typeof id!=="string"||id.length>120||(status!=="active"&&status!=="suspended"))throw new StaffError("Acción no válida.");if(id===actor.staffId)throw new StaffError("No puedes suspender tu propio acceso.");await transaction(async db=>{await db.query("SELECT pg_advisory_xact_lock(hashtext('oc-staff-invitations'))");await liveActor(db,actor);const found=await db.query(`SELECT id,status FROM ${t("oc_client_staff_user")} WHERE id=$1 FOR UPDATE`,[id]);if(!found.rows[0])throw new StaffError("Usuario no encontrado.",404);if(found.rows[0].status===status)return;
 if(status==="suspended" && (await db.query(`SELECT role FROM ${t("oc_client_staff_user")} WHERE id=$1`,[id])).rows[0]?.role==="administrator"){const count=await db.query(`SELECT count(*)::int AS n FROM ${t("oc_client_staff_user")} WHERE status='active' AND role='administrator'`);if(Number(count.rows[0].n)<=1)throw new StaffError("Debe quedar al menos un administrador activo.");}
 await db.query(`UPDATE ${t("oc_client_staff_user")} SET status=$2,"updatedAt"=now() WHERE id=$1`,[id,status]);if(status==="suspended")await db.query(`DELETE FROM ${t("oc_client_staff_session")} WHERE "userId"=$1`,[id]);await db.query(`INSERT INTO ${t("oc_client_staff_events")}(actor,kind,entity_id) VALUES($1,$2,$3)`,[actor.u,status==="suspended"?"user_suspended":"user_activated",id]);});}
const invalidLink=()=>new StaffError("Este enlace no está disponible: puede haber vencido, sido utilizado o cancelado.");
async function invitationForToken(token:unknown){if(typeof token!=="string"||!/^\w{64}$/.test(token)||!/^[0-9a-f]{64}$/.test(token))throw invalidLink();const hash=createHash("sha256").update(token).digest("hex");const r=await clientPool().query(`SELECT id,email,rut_enc,rut_hash,role FROM ${t("oc_client_staff_invites")} WHERE token_hash=$1 AND status='pending' AND expires_at>now()`,[hash]);if(!r.rows[0])throw invalidLink();return r.rows[0];}
export async function lookupStaffInvitation(token:unknown){const row=await invitationForToken(token),rut=revealClientValue(row.rut_enc,"staff-rut");return{email:row.email,rutEnding:`${rut.slice(-4,-1)}-${rut.slice(-1)}`,role:row.role as StaffInvite["role"]};}
export async function acceptStaffInvitation(raw:Record<string,unknown>,auth=staffAuth()){
 const name=typeof raw.name==="string"?raw.name.trim().normalize("NFC"):"",password=typeof raw.password==="string"?raw.password:"";
 if(name.length<2||name.length>160||! /^[\p{L}\p{M} .’'-]+$/u.test(name))throw new StaffError("Ingresa tu nombre completo.");
 if(password.length<8||password.length>128)throw new StaffError("Usa una contraseña de entre 8 y 128 caracteres.");
 if(raw.role!==undefined||raw.email!==undefined||raw.rut!==undefined)throw new StaffError("Los datos de acceso se toman de la invitación y no pueden cambiarse aquí.");
 const invite=await invitationForToken(raw.token);
 let createdId:string;
 try{const created=await staffRegistration.run({id:invite.id,email:invite.email,rutCipher:invite.rut_enc,rutHash:invite.rut_hash,role:invite.role},()=>auth.api.signUpEmail({body:{name,email:invite.email,password}}));createdId=created.user.id;}catch{throw new StaffError("No se pudo crear el acceso. Revisa el enlace o inicia sesión si ya completaste el registro.");}
 const saved=await clientPool().query(`SELECT id FROM ${t("oc_client_staff_user")} WHERE "invitationId"=$1 AND email=$2`,[invite.id,invite.email]);if(!saved.rows[0]||saved.rows[0].id!==createdId)throw invalidLink();
 return{ok:true};
}
export async function allowStaffRequest(ip:string,kind:"lookup"|"register"){
 const seed=process.env.SESSION_SECRET||process.env.CLIENT_AUTH_SECRET||"";if(seed.length<32)throw new Error("No está configurada la seguridad del personal.");
 const key=createHmac("sha256",seed).update(`staff-${kind}:${ip.slice(0,200)}`).digest("hex"),r=await clientPool().query(`INSERT INTO ${t("oc_client_staff_request_limit")} AS limits(key,count,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.reset_at<now() THEN 1 ELSE limits.count+1 END,reset_at=CASE WHEN limits.reset_at<now() THEN now()+interval '15 minutes' ELSE limits.reset_at END RETURNING count`,[key]);return Number(r.rows[0].count)<=(kind==="lookup"?30:10);
}
