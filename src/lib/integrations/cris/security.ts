import 'server-only';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {clientPool,clientTable as t} from '@/lib/clients/db';
import {IntegrationError,parseIntegrationContact,limitIntegration} from '../whatsapp';
import {getCustomerIntegrationContact} from '@/lib/clients/store';
export const scopes=['finance:read','orders:read','commercial:read','tickets:read','tickets:write','requests:read','requests:write','attachments:write'] as const;
export type Scope=typeof scopes[number];
export type ApiKey={id:string;tokenHash:string;scopes:Scope[];senderSigningSecret?:string};
export const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export function fail(code:string,message:string,status=400):never{throw new IntegrationError(code,message,status);}
export function object(raw:unknown,allowed:string[]):Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('INVALID_INPUT','Objeto JSON requerido.');const b=raw as Record<string,unknown>;if(Object.keys(b).some(k=>!allowed.includes(k)))fail('INVALID_INPUT','Campo no permitido.');return b;}
export function text(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail('INVALID_INPUT','Texto no válido.');return value.trim();}
export function uuid(value:unknown){if(typeof value!=='string'||!/^([a-f\d]{8}-)([a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value))fail('INVALID_INPUT','Identificador no válido.');return value;}
export function authenticate(request:Request,scope:Scope):ApiKey {
 if(process.env.CRIS_API_ENABLED!=='true')fail('NOT_CONFIGURED','Capacidad no habilitada.',503);
 let keys:ApiKey[];
 try{keys=JSON.parse(process.env.CRIS_API_KEYS_JSON||'[]');if(!Array.isArray(keys)||!keys.length||new Set(keys.map(k=>k.id)).size!==keys.length||new Set(keys.map(k=>k.tokenHash)).size!==keys.length||keys.some(k=>!k||!/^[a-z0-9_-]{3,32}$/.test(k.id)||! /^[a-f0-9]{64}$/.test(k.tokenHash)||!Array.isArray(k.scopes)||!k.scopes.length||k.scopes.some(s=>!scopes.includes(s))||(k.senderSigningSecret!==undefined&&!/^[A-Za-z0-9_-]{43,128}$/.test(k.senderSigningSecret))))throw Error();}catch{fail('NOT_CONFIGURED','Configuración no disponible.',503);}
 const token=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(request.headers.get('authorization')||'')?.[1]||'';const hash=Buffer.from(digest(token),'hex');let found:ApiKey|undefined;
 for(const key of keys!)if(timingSafeEqual(hash,Buffer.from(key.tokenHash,'hex')))found=key;
 if(!token||!found)fail('UNAUTHORIZED','Token no válido.',401);
 if(!found.scopes.includes(scope))fail('SCOPE_REQUIRED','Permiso insuficiente.',403);
 if(request.headers.has('origin'))fail('SERVER_ONLY','Solo servidor a servidor.',403);
 if(process.env.NODE_ENV==='production'&&new URL(request.url).protocol!=='https:')fail('HTTPS_REQUIRED','Se requiere HTTPS.');
 return found;
}
export async function verifySenderEnvelope(request:Request,raw:Buffer,key:ApiKey){
 if(!key.senderSigningSecret)fail('SENDER_PROOF_REQUIRED','Falta la prueba del adaptador confiable.',403);
 const ts=request.headers.get('x-cris-timestamp')||'',nonce=request.headers.get('x-cris-nonce')||'',signature=request.headers.get('x-cris-signature')||'';
 if(!/^\d{10}$/.test(ts)||Math.abs(Date.now()/1000-Number(ts))>300||! /^[A-Za-z0-9_-]{22,128}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))fail('INVALID_SENDER_PROOF','Prueba de remitente no válida.',403);
 const canonical=[ts,nonce,request.method,new URL(request.url).pathname,digest(raw)].join('\n');
 const expected=createHmac('sha256',key.senderSigningSecret).update(canonical).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))fail('INVALID_SENDER_PROOF','Prueba de remitente no válida.',403);
 const r=await clientPool().query(`INSERT INTO ${t('oc_client_cris_nonces')}(key_id,nonce_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes') ON CONFLICT DO NOTHING RETURNING key_id`,[key.id,digest(nonce)]);
 if(!r.rowCount)fail('REPLAY_DETECTED','Usa una nueva prueba en cada intento.',409);
}
export async function owner(body:Record<string,unknown>,keyId:string){
 const d=object(body.document,['type','number']);if(d.type!=='RUT')fail('UNSUPPORTED_DOCUMENT','Documento pendiente de revisión humana.');
 const sender=object(body.sender,['source','whatsapp','messageId']);if(sender.source!=='kapso')fail('INVALID_INPUT','Origen de remitente no válido.');text(sender.messageId,200);
 const contact=parseIntegrationContact({rut:d.number,whatsapp:sender.whatsapp});
 await limitIntegration(keyId,contact);
 const record=await getCustomerIntegrationContact(contact.rut);
 const {normalizeIntegrationWhatsapp}=await import('../whatsapp');let number='';try{number=record?normalizeIntegrationWhatsapp(record.whatsapp):'';}catch{}
 if(!record||number!==contact.whatsapp)fail('CONTACT_NOT_MATCHED','No pudimos vincular estos datos. Contacta a la óptica.',404);
 return{customer:record.customer,contact};
}
/** Recheck under the same row lock as a reception, so a phone change cannot race a write. */
export async function lockOwner(db:import('pg').PoolClient,id:string,contact:{rut:string;whatsapp:string}){
 const {clientFingerprint,revealClientValue}=await import('@/lib/clients/privacy');const {normalizeIntegrationWhatsapp}=await import('../whatsapp');
 const row=(await db.query(`SELECT "rutHash","whatsappCipher" FROM ${t('oc_client_user')} WHERE id=$1 FOR UPDATE`,[id])).rows[0];let phone='';try{phone=row?normalizeIntegrationWhatsapp(revealClientValue(row.whatsappCipher,'whatsapp')):'';}catch{}
 if(!row||row.rutHash!==clientFingerprint(contact.rut,'rut')||phone!==contact.whatsapp)fail('CONTACT_NOT_MATCHED','No pudimos vincular estos datos. Contacta a la óptica.',404);
}
