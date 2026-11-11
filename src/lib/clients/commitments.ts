import "server-only";
import { createHash } from "node:crypto";
import { clientPool, clientTable } from "./db";
import { protectClientValue, revealClientValue } from "./privacy";
import { normalizeClientRut, validClientRut } from "./validation";
import type { PoolClient } from "pg";
import { CLIENT_MAIL_COMPANY } from "./mail";
import { approvedAgreementModel } from "./agreement-registry";
import type { AgreementModel } from "./agreement-model";
import type { CustomerSale } from "./sales-types";

export type ContractSettings = { representativeName: string; representativeRut: string; representativeAuthority?: string; signature: string; paymentMethod: "local" | "transfer" | "both" | "all"; webpayUrl: string | null; legalAnnualMaximum: number; latePolicyEffectiveAt: string };
export type ContractSettingsSummary = Omit<ContractSettings,"signature"> & { signatureConfigured: boolean };
export type CreditAgreementDocument = {
 version: string; preparedAt: string;
 company: typeof CLIENT_MAIL_COMPANY;
 representative: { name: string; rut: string; signature: string; authority?: string };
 model?: { id: string; hash: string; definition: AgreementModel; sample?: boolean };
 references?: { appsFlySale: string; workOrder: string };
 customer: { name: string; rut: string; email: string; whatsapp: string };
 sale: Pick<CustomerSale,"id"|"productName"|"quantity"|"total"|"net"|"vat"|"deposit"|"credit"|"createdAt">;
 installments: { number: number; dueDate: string; amount: number }[];
 paymentMethod: ContractSettings["paymentMethod"];
 ordinaryAnnualRate: 0; lateAnnualRate: number; lateGraceDays: number; legalAnnualMaximum: number; webpayUrl: string | null;
};
export class CommitmentError extends Error {}

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
 return {representativeName,representativeRut,representativeAuthority:input.representativeAuthority ? text(input.representativeAuthority,"el antecedente de las facultades",1000) : previous?.representativeAuthority,signature,paymentMethod,webpayUrl,legalAnnualMaximum,latePolicyEffectiveAt:previous?.latePolicyEffectiveAt||new Date().toISOString()};
}
async function readSettings() {
 const result=await clientPool().query(`SELECT payload_enc FROM ${clientTable("oc_client_contract_settings")} WHERE id=true`);
 return result.rows[0]?JSON.parse(revealClientValue(result.rows[0].payload_enc,"contract-settings")) as ContractSettings:null;
}
export async function contractSettingsSummary(): Promise<ContractSettingsSummary|null> {
 const settings=await readSettings();
 return settings?{representativeAuthority:settings.representativeAuthority,representativeName:settings.representativeName,representativeRut:settings.representativeRut,paymentMethod:settings.paymentMethod,signatureConfigured:true,webpayUrl:settings.webpayUrl,legalAnnualMaximum:settings.legalAnnualMaximum,latePolicyEffectiveAt:settings.latePolicyEffectiveAt}:null;
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
  const selectedHash=process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH;
  let model;try{model=selectedHash ? await approvedAgreementModel(db,selectedHash) : null;}catch(error){throw new CommitmentError((error as Error).message);}
  if(model&&!settings.representativeAuthority)throw new CommitmentError("Completa el antecedente de las facultades del representante.");
  const refs=owner.request_data;
  const references={appsFlySale:refs?.appsFlySale ? text(refs.appsFlySale,"el número de venta AppsFly",100) : "No informado",workOrder:refs?.workOrder ? text(refs.workOrder,"la orden de trabajo",100) : "No informada"};
  const version=model ? `${model.definition.identifier}-${model.definition.version}` : "2026-11-02-compromiso-v3";
  const document:CreditAgreementDocument={version,...(model?{model:{id:model.row.id,hash:model.row.content_hash,definition:model.definition},references}:{}),preparedAt:new Date().toISOString(),company:{...CLIENT_MAIL_COMPANY},
   representative:{name:settings.representativeName,rut:settings.representativeRut,signature:settings.signature,authority:settings.representativeAuthority},
   customer:{name:`${owner.firstName} ${owner.lastName}`,rut:revealClientValue(owner.rutCipher,"rut"),email:owner.email,whatsapp:revealClientValue(owner.whatsappCipher,"whatsapp")},
   sale:{id:sale.id,productName:sale.productName,quantity:sale.quantity,total:sale.total,net:sale.net,vat:sale.vat,deposit:sale.deposit,credit:sale.credit,createdAt:sale.createdAt},
   installments:sale.installments.map(({number,dueDate,amount})=>({number,dueDate,amount})),paymentMethod:settings.paymentMethod,ordinaryAnnualRate:0,lateAnnualRate:new Date(sale.createdAt)>=new Date(settings.latePolicyEffectiveAt)?Math.min(18,settings.legalAnnualMaximum):0,lateGraceDays:60,legalAnnualMaximum:settings.legalAnnualMaximum,webpayUrl:settings.webpayUrl};
  const clear=JSON.stringify(document);
  if(model){
  const {creditAgreementPdf}=await import("./credit-agreement-pdf");
  const pdf=Buffer.from(await creditAgreementPdf(document));
  await db.query(`INSERT INTO ${clientTable("oc_client_commitments")}(sale_id,user_id,version,payload_enc,content_hash,prepared_by,model_id,pdf_enc,pdf_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[saleId,owner.user_id,version,protectClientValue(clear,"contract-document"),createHash("sha256").update(clear).digest("hex"),actor,model.row.id,protectClientValue(pdf.toString("base64"),"contract-document"),createHash("sha256").update(pdf).digest("hex")]);
  await db.query(`UPDATE ${clientTable("oc_client_sales")} SET commitment_version=$2 WHERE id=$1`,[saleId,version]);
  }else{
   await db.query(`INSERT INTO ${clientTable("oc_client_commitments")}(sale_id,user_id,version,payload_enc,content_hash,prepared_by) VALUES($1,$2,$3,$4,$5,$6)`,[saleId,owner.user_id,version,protectClientValue(clear,"contract-document"),createHash("sha256").update(clear).digest("hex"),actor]);
  }
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
 const { effectiveAgreementDate }=await import("./agreement-acceptance");
 const signedOn=await effectiveAgreementDate(document,saleId,sale.signed_at);
 const { calculateLateInterest }=await import("./loan-interest");
 const interest=calculateLateInterest(installments.rows.map(i=>({amount:Number(i.amount),dueDate:i.due_date})),payments.rows.map(p=>({amount:Number(p.amount),paidOn:p.paid_on,interestAmount:Number(p.interest_amount),interestWaived:Number(p.interest_waived)})),asOf,signedOn?Math.min(document.lateAnnualRate,document.legalAnnualMaximum,signedOn.legalAnnualLimit):0,document.lateGraceDays,signedOn?.date);
 return{...interest,annualRate:signedOn?Math.min(document.lateAnnualRate,document.legalAnnualMaximum,signedOn.legalAnnualLimit):0,principalDue:Number(sale.remaining),totalDue:Number(sale.remaining)+interest.due,asOf};
}

/** Original issued bytes, owner scoped; never regenerate a revised agreement. */
export async function storedAgreementPdf(saleId:string,userId:string){
 const r=await clientPool().query(`SELECT pdf_enc,pdf_hash FROM ${clientTable("oc_client_commitments")} WHERE sale_id=$1 AND user_id=$2`,[saleId,userId]);
 if(!r.rows[0]?.pdf_enc||!r.rows[0].pdf_hash)throw new CommitmentError("No hay un PDF original íntegro disponible. Revisa el respaldo sin regenerarlo.");
 const bytes=Buffer.from(revealClientValue(r.rows[0].pdf_enc,"contract-document"),"base64");
 if(createHash("sha256").update(bytes).digest("hex")!==r.rows[0].pdf_hash)throw new CommitmentError("No se pudo verificar la integridad del PDF original.");
 return bytes;
}
