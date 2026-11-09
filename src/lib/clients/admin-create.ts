import 'server-only';
import {randomUUID} from 'node:crypto';
import {clientPool,clientTable as t} from './db';
import {clientFingerprint,protectClientValue} from './privacy';
import {normalizeClientRut,validClientRut,parseCustomerContact} from './validation';
import {createClientAuth} from './auth';
import {sendClientMail} from './mail';

export class AdminCreateError extends Error {
 constructor(message:string,public status=400){super(message);}
}
export async function limitStaffCustomerAction(value:string,purpose:string,max:number,seconds=3600){
 const r=await clientPool().query(`INSERT INTO ${t('oc_client_registration_limit')} AS c(key,count,reset_at)
 VALUES($1,1,now()+($3*interval '1 second')) ON CONFLICT(key) DO UPDATE
 SET count=CASE WHEN c.reset_at<=now() THEN 1 ELSE LEAST(c.count+1,$2+1) END,
 reset_at=CASE WHEN c.reset_at<=now() THEN now()+($3*interval '1 second') ELSE c.reset_at END RETURNING count`,[clientFingerprint(value,'staff-customer:'+purpose),max,seconds]);
 if(r.rows[0].count>max)throw new AdminCreateError('Espera antes de volver a intentarlo.',429);
}
export async function inviteCreatedCustomer(id:string){
 const r=await clientPool().query(`SELECT email FROM ${t('oc_client_user')} u WHERE id=$1 AND NOT EXISTS(
 SELECT 1 FROM ${t('oc_client_account')} a WHERE a."userId"=u.id AND a."providerId"='credential')`,[id]);
 if(!r.rows.length)throw new AdminCreateError('Si el cliente ya tiene acceso, puede recuperar su contraseña desde la web.',409);
 await limitStaffCustomerAction(id,'invite-minute',1,60);
 await limitStaffCustomerAction(id,'invite',3);
 await limitStaffCustomerAction('all','invite-global',200);
 const email=String(r.rows[0].email);
 let sent=false;
 await createClientAuth(clientPool(),async m=>{
   if(m.to!==email)return;
   await sendClientMail({...m,kind:'setup'});sent=true;
 }).api.requestPasswordReset({body:{email,redirectTo:'/mi-cuenta/restablecer'}});
 if(!sent)throw new AdminCreateError('No se pudo confirmar el envío del enlace.',503);
}
export async function createStaffCustomer(raw:unknown,actor:string){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AdminCreateError('Revisa los datos.');
 const b=raw as Record<string,unknown>;
 if(Object.keys(b).some(k=>!['firstName','lastName','rut','email','whatsapp','privacyAccepted'].includes(k)))throw new AdminCreateError('Campos no permitidos.');
 let contact;try{contact=parseCustomerContact(b);}catch(e){throw new AdminCreateError((e as Error).message);}
 const rut=normalizeClientRut(typeof b.rut==='string'?b.rut:'');
 if(!validClientRut(rut))throw new AdminCreateError('Revisa el RUT y su dígito verificador.');
 if(b.privacyAccepted!==true)throw new AdminCreateError('Confirma que el cliente autorizó registrar sus datos.');
 const hash=clientFingerprint(rut,'rut'),db=await clientPool().connect(),id=randomUUID();
 const existing=async()=> (await db.query(`SELECT id FROM ${t('oc_client_user')} WHERE "rutHash"=$1`,[hash])).rows[0]?.id;
 const reused=(customerId:string)=>({customerId,created:false,invitationSent:false});
 try{
  await db.query('BEGIN');
  const found=await existing();if(found){await db.query('COMMIT');return reused(found);}
  await db.query(`INSERT INTO ${t('oc_client_user')}(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,contact.firstName+' '+contact.lastName,contact.email,contact.firstName,contact.lastName,protectClientValue(rut,'rut'),hash,protectClientValue(contact.whatsapp,'whatsapp')]);
  await db.query(`INSERT INTO ${t('oc_client_profile_changes')}(id,customer_id,actor,payload_enc) VALUES($1,$2,$3,$4)`,[randomUUID(),id,actor,protectClientValue(JSON.stringify({action:'staff-create',privacyAccepted:true}),'profile-change')]);
  await db.query('COMMIT');
 }catch(e){
  await db.query('ROLLBACK');
  if(e&&typeof e==='object'&&'code' in e&&e.code==='23505'){const found=await existing();if(found)return reused(found);throw new AdminCreateError('Ese correo ya está asociado o reservado para otro cliente.',409);}
  throw e;
 }finally{db.release();}
 let invitationSent=false;try{await inviteCreatedCustomer(id);invitationSent=true;}catch{/* The saved profile remains available for a retry. */}
 return{customerId:id,created:true,invitationSent};
}
