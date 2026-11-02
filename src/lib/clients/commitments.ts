import "server-only";
import { createHash } from "node:crypto";
import { clientPool, clientTable } from "./db";
import { protectClientValue, revealClientValue } from "./privacy";
import { normalizeClientRut, validClientRut } from "./validation";
import type { PoolClient } from "pg";
import { CLIENT_MAIL_COMPANY } from "./mail";
import type { CustomerSale } from "./sales-types";

export type ContractSettings = { representativeName: string; representativeRut: string; signature: string; paymentMethod: "local" | "transfer" | "both" | "all"; webpayUrl: string | null; legalAnnualMaximum: number; latePolicyEffectiveAt: string };
export type ContractSettingsSummary = Omit<ContractSettings,"signature"> & { signatureConfigured: boolean };
export type CreditAgreementDocument = {
 version: string; preparedAt: string;
 company: typeof CLIENT_MAIL_COMPANY;
 representative: { name: string; rut: string; signature: string };
 customer: { name: string; rut: string; email: string; whatsapp: string };
 sale: Pick<CustomerSale,"id"|"productName"|"quantity"|"total"|"net"|"vat"|"deposit"|"credit"|"createdAt">;
 installments: { number: number; dueDate: string; amount: number }[];
 paymentMethod: ContractSettings["paymentMethod"];
 ordinaryAnnualRate: 0; lateAnnualRate: number; lateGraceDays: number; legalAnnualMaximum: number; webpayUrl: string | null;
};
export class CommitmentError extends Error {}
const version = "2026-11-02-compromiso-v3";
function text(value: unknown, label: string, maximum: number) {
 if(typeof value!=="string" || value.trim().length<2 || value.length>maximum || /[\u0000-\u001f]/.test(value))throw new CommitmentError(`Revisa ${label}.`);
 return value.trim();
}
export function validateSignature(value: unknown) {
 if(typeof value!=="string" || value.length>115_000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw new CommitmentError("Selecciona una firma en PNG de hasta 80 KB.");
 const bytes=Buffer.from(value.slice("data:image/png;base64,".length),"base64");
 if(bytes.length<45 || bytes.length>80_000 || bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a" || bytes.subarray(12,16).toString()!=="IHDR")throw new CommitmentError("El archivo debe ser una imagen PNG válida de hasta 80 KB.");
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1 || height<1 || width>2000 || height>1000)throw new CommitmentError("La firma debe medir como máximo 2000 × 1000 píxeles.");
 return value;
}
export function parseContractSettings(input: Record<string,unknown>, previous?: ContractSettings | null): ContractSettings {
 if(input.authorizeCurrentTerms!==true)throw new CommitmentError("Confirma las condiciones de mora para los contratos nuevos.");
 if(input.authorizeSignature!==true)throw new CommitmentError("Confirma la autorización para incorporar la firma preimpresa.");
 const representativeName=text(input.representativeName,"el nombre legal del representante",160);
 const representativeRut=normalizeClientRut(text(input.representativeRut,"el RUT del representante",20));
 if(!validClientRut(representativeRut))throw new CommitmentError("El RUT del representante no es válido.");
 const paymentMethod=input.paymentMethod;
 if(paymentMethod!=="local" && paymentMethod!=="transfer" && paymentMethod!=="both" && paymentMethod!=="all")throw new CommitmentError("Selecciona los medios de pago.");
 let webpayUrl:string|null=null;
 if(input.webpayUrl){if(typeof input.webpayUrl!=="string"||input.webpayUrl.length>500)throw new CommitmentError("Revisa el enlace Webpay.");try{const url=new URL(input.webpayUrl);if(url.protocol!=="https:"||url.username||url.password||!["webpay.cl","www.webpay.cl"].includes(url.hostname))throw new Error();webpayUrl=url.toString();}catch{throw new CommitmentError("Usa el enlace HTTPS oficial de Webpay de la óptica.");}}
 if(paymentMethod==="all"&&!webpayUrl)throw new CommitmentError("Agrega el enlace oficial para habilitar Webpay, o conserva local y transferencia.");
 const legalAnnualMaximum=Number(input.legalAnnualMaximum);
 if(!Number.isFinite(legalAnnualMaximum)||legalAnnualMaximum<0.01||legalAnnualMaximum>100||Math.abs(legalAnnualMaximum*100-Math.round(legalAnnualMaximum*100))>0.00001||input.legalLimitChecked!==true)throw new CommitmentError("Confirma el máximo legal anual consultado en la CMF.");
 const signature=validateSignature(input.signature || previous?.signature);
 return {representativeName,representativeRut,signature,paymentMethod,webpayUrl,legalAnnualMaximum,latePolicyEffectiveAt:previous?.latePolicyEffectiveAt||new Date().toISOString()};
}
async function readSettings() {
 const result=await clientPool().query(`SELECT payload_enc FROM ${clientTable("oc_client_contract_settings")} WHERE id=true`);
 return result.rows[0]?JSON.parse(revealClientValue(result.rows[0].payload_enc,"contract-settings")) as ContractSettings:null;
}
export async function contractSettingsSummary(): Promise<ContractSettingsSummary|null> {
 const settings=await readSettings();
 return settings?{representativeName:settings.representativeName,representativeRut:settings.representativeRut,paymentMethod:settings.paymentMethod,signatureConfigured:true,webpayUrl:settings.webpayUrl,legalAnnualMaximum:settings.legalAnnualMaximum,latePolicyEffectiveAt:settings.latePolicyEffectiveAt}:null;
}
export async function saveContractSettings(input: Record<string,unknown>, actor: string) {
 const settings=parseContractSettings(input,await readSettings());
 await clientPool().query(`INSERT INTO ${clientTable("oc_client_contract_settings")}(id,payload_enc,updated_by) VALUES(true,$1,$2) ON CONFLICT(id) DO UPDATE SET payload_enc=EXCLUDED.payload_enc,updated_by=EXCLUDED.updated_by,updated_at=now()`,[protectClientValue(JSON.stringify(settings),"contract-settings"),actor]);
}
export function decodeCommitment(row: { payload_enc: string; content_hash: string }) {
 const clear=revealClientValue(row.payload_enc,"contract-document");
 if(createHash("sha256").update(clear).digest("hex")!==row.content_hash)throw new Error("No se pudo verificar la integridad del documento.");
 return JSON.parse(clear) as CreditAgreementDocument;
}
export async function getStoredCommitment(saleId: string, userId: string, db?:Pick<PoolClient,"query">): Promise<CreditAgreementDocument|null> {
 try {
  const result=await (db??clientPool()).query(`SELECT payload_enc,content_hash FROM ${clientTable("oc_client_commitments")} WHERE sale_id=$1 AND user_id=$2`,[saleId,userId]);
  return result.rows[0]?decodeCommitment(result.rows[0]):null;
 } catch(error) {
  // Existing documents remain available during the additive migration rollout.
  if(error && typeof error==="object" && "code" in error && error.code==="42P01")return null;
  throw error;
 }
}
export async function prepareCommitment(saleId: unknown, actor: string, transaction?:PoolClient) {
 if(typeof saleId!=="string" || !saleId || saleId.length>120)throw new CommitmentError("La venta no es válida.");
 const db=transaction??await clientPool().connect(),ownsTransaction=!transaction;
 try {
  if(ownsTransaction)await db.query("BEGIN");
  const found=await db.query(`SELECT s.*,u."firstName",u."lastName",u.email,u."rutCipher",u."whatsappCipher" FROM ${clientTable("oc_client_sales")} s JOIN ${clientTable("oc_client_user")} u ON u.id=s.user_id WHERE s.id=$1 FOR UPDATE OF s`,[saleId]);
  const owner=found.rows[0];
  if(!owner || owner.status!=="active")throw new CommitmentError("No se puede preparar el compromiso de esta venta.");
  const existing=await db.query(`SELECT payload_enc,content_hash FROM ${clientTable("oc_client_commitments")} WHERE sale_id=$1`,[saleId]);
  if(existing.rows[0]){decodeCommitment(existing.rows[0]);if(ownsTransaction)await db.query("COMMIT");return;}
  if(owner.signed_at)throw new CommitmentError("Esta venta ya tiene firma confirmada. Conserva el ejemplar original.");
  if(Number(owner.remaining)<=0)throw new CommitmentError("La venta ya está pagada; consulta su documento original.");
  const configured=await db.query(`SELECT payload_enc FROM ${clientTable("oc_client_contract_settings")} WHERE id=true`);
  if(!configured.rows[0])throw new CommitmentError("El responsable debe configurar la firma y los medios de pago antes de generar el compromiso.");
  const settings=JSON.parse(revealClientValue(configured.rows[0].payload_enc,"contract-settings")) as ContractSettings;
  if(!Number(owner.credit))throw new CommitmentError("Esta venta no tiene crédito.");
  const schedule=await db.query(`SELECT number,due_date::text,amount FROM ${clientTable("oc_client_installments")} WHERE sale_id=$1 ORDER BY number`,[saleId]);
  const sale={id:saleId,productName:String(owner.product_name),quantity:Number(owner.quantity),total:Number(owner.total),net:Number(owner.net),vat:Number(owner.vat),deposit:Number(owner.deposit),credit:Number(owner.credit),createdAt:new Date(owner.created_at).toISOString(),installments:schedule.rows.map(i=>({number:Number(i.number),dueDate:String(i.due_date),amount:Number(i.amount)}))};
  if(sale.total!==sale.net+sale.vat || sale.total!==sale.deposit+sale.credit || !sale.installments.length || sale.installments.length>4 || sale.installments.reduce((sum,i)=>sum+i.amount,0)!==sale.credit)throw new CommitmentError("El calendario y los importes de la venta no coinciden. Revisa la venta antes de emitir el documento.");
  const document:CreditAgreementDocument={version,preparedAt:new Date().toISOString(),company:{...CLIENT_MAIL_COMPANY},
   representative:{name:settings.representativeName,rut:settings.representativeRut,signature:settings.signature},
   customer:{name:`${owner.firstName} ${owner.lastName}`,rut:revealClientValue(owner.rutCipher,"rut"),email:owner.email,whatsapp:revealClientValue(owner.whatsappCipher,"whatsapp")},
   sale:{id:sale.id,productName:sale.productName,quantity:sale.quantity,total:sale.total,net:sale.net,vat:sale.vat,deposit:sale.deposit,credit:sale.credit,createdAt:sale.createdAt},
   installments:sale.installments.map(({number,dueDate,amount})=>({number,dueDate,amount})),paymentMethod:settings.paymentMethod,ordinaryAnnualRate:0,lateAnnualRate:new Date(sale.createdAt)>=new Date(settings.latePolicyEffectiveAt)?Math.min(18,settings.legalAnnualMaximum):0,lateGraceDays:60,legalAnnualMaximum:settings.legalAnnualMaximum,webpayUrl:settings.webpayUrl};
  const clear=JSON.stringify(document);
  await db.query(`INSERT INTO ${clientTable("oc_client_commitments")}(sale_id,user_id,version,payload_enc,content_hash,prepared_by) VALUES($1,$2,$3,$4,$5,$6)`,[saleId,owner.user_id,version,protectClientValue(clear,"contract-document"),createHash("sha256").update(clear).digest("hex"),actor]);
  if(ownsTransaction)await db.query("COMMIT");
 }catch(error){if(ownsTransaction)await db.query("ROLLBACK");throw error;}finally{if(ownsTransaction)db.release();}
}

/** Owner-scoped, read-only settlement estimate. Recording a payment rechecks under lock. */
export async function saleInterestQuote(saleId:unknown,asOf:string,userId?:string){
 if(typeof saleId!=="string"||!saleId||saleId.length>120)throw new CommitmentError("La venta no es válida.");
 const date=new Date(`${asOf}T12:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==asOf)throw new CommitmentError("La fecha del pago no es válida.");
 const result=await clientPool().query(`SELECT user_id,remaining,status,signed_at FROM ${clientTable("oc_client_sales")} WHERE id=$1 AND ($2::text IS NULL OR user_id=$2)`,[saleId,userId??null]);
 const sale=result.rows[0];if(!sale||sale.status!=="active")throw new CommitmentError("La venta no está disponible.");
 const document=await getStoredCommitment(saleId,sale.user_id);
 if(!document?.lateAnnualRate)return{annualRate:0,principalDue:Number(sale.remaining),due:0,totalDue:Number(sale.remaining),asOf};
 const[installments,payments]=await Promise.all([clientPool().query(`SELECT amount,due_date::text FROM ${clientTable("oc_client_installments")} WHERE sale_id=$1 ORDER BY number`,[saleId]),clientPool().query(`SELECT amount,paid_on::text,interest_amount,interest_waived FROM ${clientTable("oc_client_payments")} WHERE sale_id=$1 AND reversed_at IS NULL ORDER BY paid_on,created_at,id`,[saleId])]);
 const { calculateLateInterest }=await import("./loan-interest");
 const interest=calculateLateInterest(installments.rows.map(i=>({amount:Number(i.amount),dueDate:i.due_date})),payments.rows.map(p=>({amount:Number(p.amount),paidOn:p.paid_on,interestAmount:Number(p.interest_amount),interestWaived:Number(p.interest_waived)})),asOf,sale.signed_at?Math.min(document.lateAnnualRate,document.legalAnnualMaximum):0,document.lateGraceDays,sale.signed_at?new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(sale.signed_at)):undefined);
 return{...interest,annualRate:document.lateAnnualRate,principalDue:Number(sale.remaining),totalDue:Number(sale.remaining)+interest.due,asOf};
}
