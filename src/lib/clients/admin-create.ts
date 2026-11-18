import 'server-only';
import {randomUUID} from 'node:crypto';
import {clientPool,clientTable as t} from './db';
import {protectClientValue} from './privacy';
import {parseCustomerContact} from './validation';
import {parseCustomerDocument} from './customer-document';
import {customerDocumentHash,encryptCustomerDocument,findCustomerByDocumentHash} from './customer-document-store';
import {createClientAuth} from './auth';
import {sendClientMail} from './mail';

import {AdminCreateError,limitStaffCustomerAction} from './staff-customer-limits';
import {consumeStaffContactChallenge,ensureStaffEmailAvailable,sendStaffContactChallenge} from './staff-contact-challenge';
export {AdminCreateError,limitStaffCustomerAction} from './staff-customer-limits';

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
function staffCustomerInput(raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new AdminCreateError('Revisa los datos.');
 const b=raw as Record<string,unknown>;
 if(Object.keys(b).some(k=>!['firstName','lastName','rut','documentType','documentCountry','documentNumber','email','whatsapp','privacyAccepted'].includes(k)))throw new AdminCreateError('Campos no permitidos.');
 let contact;try{contact=parseCustomerContact(b);}catch(e){throw new AdminCreateError((e as Error).message);}
 let document;try{document=parseCustomerDocument(b);}catch(e){throw new AdminCreateError((e as Error).message);}
 if(b.privacyAccepted!==true)throw new AdminCreateError('Confirma que el cliente autorizó registrar sus datos.');
 return {...contact,document};
}
export async function sendSalesRegistrationCode(raw:unknown,actor:string,ip:string){
 const data=staffCustomerInput(raw);
 const hash=customerDocumentHash(data.document);
 const existing=await findCustomerByDocumentHash(hash);
 if(existing)return {customerId:existing,created:false,invitationSent:false};
 await ensureStaffEmailAvailable(data.email);
 const subject='sale-registration:'+hash;
 return sendStaffContactChallenge(subject,subject,data.email,actor,ip);
}
export async function createStaffCustomer(raw:unknown,actor:string,proof?:Record<string,unknown>){
 const {document,...contact}=staffCustomerInput(raw);
 const hash=customerDocumentHash(document),db=await clientPool().connect(),id=randomUUID();
 const existing=()=>findCustomerByDocumentHash(hash,db);
 let verificationFailure:string|null=null;
 const reused=(customerId:string)=>({customerId,created:false,invitationSent:false});
 try{
  await db.query('BEGIN');
  const found=await existing();if(found){await db.query('COMMIT');return reused(found);}
  if(proof){
   const subject='sale-registration:'+hash;
   verificationFailure=await consumeStaffContactChallenge(db,subject,subject,contact.email,actor,proof);
   if(verificationFailure){
    const registered=await existing();
    if(registered){await db.query('COMMIT');return reused(registered);}
   }
  }
  if(!verificationFailure){
   await db.query(`INSERT INTO ${t('oc_client_user')}(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,contact.firstName+' '+contact.lastName,contact.email,contact.firstName,contact.lastName,encryptCustomerDocument(document),hash,protectClientValue(contact.whatsapp,'whatsapp'),Boolean(proof)]);
   await db.query(`INSERT INTO ${t('oc_client_profile_changes')}(id,customer_id,actor,payload_enc) VALUES($1,$2,$3,$4)`,[randomUUID(),id,actor,protectClientValue(JSON.stringify({action:'staff-create',privacyAccepted:true,emailVerified:Boolean(proof)}),'profile-change')]);
  }
  await db.query('COMMIT');
 }catch(e){
  await db.query('ROLLBACK');
  if(e&&typeof e==='object'&&'code' in e&&e.code==='23505'){const found=await existing();if(found)return reused(found);throw new AdminCreateError('Ese correo ya está asociado o reservado para otro cliente.',409);}
  throw e;
 }finally{db.release();}
 if(verificationFailure)throw new AdminCreateError(verificationFailure);
 let invitationSent=false;try{await inviteCreatedCustomer(id);invitationSent=true;}catch{/* The saved profile remains available for a retry. */}
 return{customerId:id,created:true,invitationSent};
}
