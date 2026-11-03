import "server-only";
import {createHash,timingSafeEqual} from "node:crypto";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import {clientFingerprint} from "@/lib/clients/privacy";
import {normalizeClientRut,validClientRut} from "@/lib/clients/validation";
import {getCustomerIntegrationContact,getCustomerTiers} from "@/lib/clients/store";
export class IntegrationError extends Error { constructor(public code:string,message:string,public status=400){super(message);} }
export function integrationKey(request:Request){
 const configured=(process.env.WHATSAPP_API_TOKEN_HASHES||"").split(",").map(v=>v.trim()).filter(Boolean);
 if(!configured.length||configured.some(v=>!/^[a-f0-9]{64}$/.test(v)))throw new IntegrationError("NOT_CONFIGURED","Integración no disponible.",503);
 const header=request.headers.get("authorization")||"";
 const token=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(header)?.[1]||"";
 const hash=createHash("sha256").update(token).digest();let matched=false;
 for(const expected of configured)matched=timingSafeEqual(hash,Buffer.from(expected,"hex"))||matched;
 if(!token||!matched)throw new IntegrationError("UNAUTHORIZED","Token no válido.",401);
 // A non-secret identifier for per-key limits and diagnostics; never log the bearer.
 return hash.toString("hex").slice(0,16);
}
export function normalizeIntegrationWhatsapp(input:unknown){
 if(typeof input!=="string"||input.length>32)throw new IntegrationError("INVALID_WHATSAPP","Ingresa un número internacional válido.");
 let value=input.trim().replace(/[\s()-]/g,"");
 if(/^9\d{8}$/.test(value))value="+56"+value;
 else if(/^569\d{8}$/.test(value))value="+"+value;
 else if(/^[1-9]\d{7,14}$/.test(value))value="+"+value; // WhatsApp sender IDs omit '+'.
 if(!/^\+[1-9]\d{7,14}$/.test(value)||value.startsWith("+56")&&!/^\+569\d{8}$/.test(value))throw new IntegrationError("INVALID_WHATSAPP","Ingresa un número internacional válido.");
 return value;
}
export function parseIntegrationContact(raw:unknown){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new IntegrationError("INVALID_INPUT","Envía RUT y WhatsApp.");
 const body=raw as Record<string,unknown>;
 if(Object.keys(body).some(key=>!["rut","whatsapp"].includes(key)))throw new IntegrationError("INVALID_INPUT","Solo se admiten rut y whatsapp.");
 if(typeof body.rut!=="string"||body.rut.length>20||!validClientRut(body.rut))throw new IntegrationError("INVALID_RUT","Revisa el RUT y su dígito verificador.");
 return{rut:normalizeClientRut(body.rut),whatsapp:normalizeIntegrationWhatsapp(body.whatsapp)};
}
export async function limitIntegration(keyId:string,contact?:{rut:string;whatsapp:string}){
 const key=contact?clientFingerprint(`${keyId}:${contact.rut}`,"whatsapp-api-contact"):clientFingerprint(keyId,"whatsapp-api-key");
 const seconds=contact?900:60,max=contact?10:60;
 const r=await clientPool().query(`INSERT INTO ${t("oc_client_integration_limits")} AS limits(key,count,reset_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.reset_at<=now() THEN 1 ELSE limits.count+1 END,reset_at=CASE WHEN limits.reset_at<=now() THEN now()+($2*interval '1 second') ELSE limits.reset_at END RETURNING count`,[key,seconds]);
 if(Number(r.rows[0].count)>max)throw new IntegrationError("RATE_LIMITED","Demasiadas consultas. Intenta más tarde.",429);
}
export async function integrationAudit(requestId:string,keyId:string,action:string,outcome:string){
 // Retain diagnostics without RUT, phone, email, balances, tokens or message contents.
 await clientPool().query(`INSERT INTO ${t("oc_client_integration_events")}(id,key_id,action,outcome) VALUES($1,$2,$3,$4)`,[requestId,keyId,action,outcome]);
}
export async function queryWhatsappCustomer(contact:{rut:string;whatsapp:string},action:"consultar-credito"|"validar-whatsapp"){
 const record=await getCustomerIntegrationContact(contact.rut);
 let registered="";if(record)try{registered=normalizeIntegrationWhatsapp(record.whatsapp);}catch{/* Corrupt contact data must not disclose RUT existence. */}
 if(!record||registered!==contact.whatsapp)throw new IntegrationError("CONTACT_NOT_MATCHED","No pudimos vincular estos datos. Contacta a la óptica para revisarlos.",404);
 const c=record.customer;
 const whatsapp={formatValid:true,matchesRegistered:true,ownershipVerified:c.whatsappVerified,activeAccountChecked:false};
 if(action==="validar-whatsapp")return{whatsapp};
 const reason=!c.emailVerified?"EMAIL_VERIFICATION_REQUIRED":c.credit.principalOutstanding>0?"ACTIVE_CREDIT":c.credit.available<=0?"NO_AVAILABLE_CREDIT":"AVAILABLE";
 return{currency:"CLP",category:{code:c.tier.code,name:c.tier.name,maximumCredit:c.tier.maxAmount,maximumPercent:c.tier.maxPercent,maximumMonthlyInstallments:c.tier.maxInstallments},credit:{capacity:c.credit.capacity,usableNow:c.credit.available,hasCapacity:c.credit.capacity>0,canUseNow:c.credit.available>0,reason},requirements:{emailVerified:c.emailVerified,whatsappVerificationRequired:false,inPersonIdentityReview:true,paymentAgreementRequired:true,inStorePurchase:true},whatsapp};
}

/** Business conditions only. No customer lookup or personal data. */
export async function queryWhatsappConditions(){
 const tiers=await getCustomerTiers();
 return {currency:"CLP",categories:tiers.map(tier=>({code:tier.code,name:tier.name,maximumCredit:tier.maxAmount,maximumPercent:tier.maxPercent,maximumMonthlyInstallments:tier.maxInstallments})),requirements:{downPaymentRequired:true,inStorePurchase:true}};
}
