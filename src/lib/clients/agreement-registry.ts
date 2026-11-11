import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "./db";
import { FORMAL_AGREEMENT_PROPOSAL, validateAgreementModel, type AgreementModel } from "./agreement-model";
import type { CreditAgreementDocument } from "./commitments";
import { CLIENT_MAIL_COMPANY } from "./mail";
export type ModelStatus="draft"|"pending"|"approved"|"retired";
export type ModelRow={id:string;identifier:string;version:number;status:ModelStatus;definition:AgreementModel;content_hash:string;sample_hash:string;created_at:string;created_by:string;change_note:string;approved_at:string|null;approved_by:string|null};
function canonical(value:unknown):string {if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;return JSON.stringify(value);}
export const modelHash=(definition:AgreementModel)=>createHash("sha256").update(canonical(definition)).digest("hex");
export function assertApprovedModel(row:ModelRow){if(row.status!=="approved"||!row.approved_by||!row.approved_at)throw new Error("No hay un modelo aprobado disponible. Solicita su revisión al responsable.");const definition=validateAgreementModel(row.definition);if(modelHash(definition)!==row.content_hash)throw new Error("La integridad del modelo no es válida.");return definition;}
export async function approvedAgreementModel(db:Pick<PoolClient,"query">, hash?:string){const r=await db.query(`SELECT * FROM ${t("oc_client_agreement_models")} WHERE status='approved' AND ($1::text IS NULL OR content_hash=$1) ORDER BY approved_at DESC,id DESC LIMIT 1 FOR SHARE`,[hash??null]);if(!r.rows[0])throw new Error("No hay un modelo aprobado. La propuesta debe revisarse y aprobarse antes de emitir compromisos nuevos.");const row=r.rows[0] as ModelRow;return{row,definition:assertApprovedModel(row)};}
export async function listAgreementModels(){const r=await clientPool().query(`SELECT id,identifier,version,status,definition,content_hash,sample_hash,created_at,created_by,change_note,approved_at,approved_by FROM ${t("oc_client_agreement_models")} ORDER BY created_at DESC,id DESC`);const history=await clientPool().query(`SELECT model_id,from_status,to_status,actor,note,created_at FROM ${t("oc_client_agreement_model_events")} ORDER BY id`);return{models:r.rows as ModelRow[],history:history.rows};}
export function specimen(definition:AgreementModel,id="MUESTRA",hash=modelHash(definition)):CreditAgreementDocument{
 return{version:`${definition.identifier}-${definition.version}`,preparedAt:new Date().toISOString(),company:CLIENT_MAIL_COMPANY,
 representative:{name:"[NOMBRE LEGAL POR COMPLETAR]",rut:"",signature:"",authority:"[Antecedente de facultades por completar y verificar]"},
 customer:{name:"[CLIENTE DE EJEMPLO - NO REAL]",rut:"",email:"ejemplo@example.invalid",whatsapp:"[No informado]"},
 sale:{id:"EJEMPLO-SIN-VENTA",productName:"Lente de ejemplo",quantity:1,total:75000,net:63025,vat:11975,deposit:52500,credit:22500,createdAt:new Date().toISOString()},
 installments:[{number:1,dueDate:"2026-12-15",amount:22500}],paymentMethod:"both",ordinaryAnnualRate:0,lateAnnualRate:18,lateGraceDays:60,legalAnnualMaximum:18,webpayUrl:null,
 model:{id,hash,definition,sample:true},references:{appsFlySale:"EJEMPLO-NO-REAL",workOrder:"EJEMPLO-NO-REAL"}};
}
export async function createAgreementModel(input:Record<string,unknown>,actor:string){
 const definition=validateAgreementModel(input.definition??FORMAL_AGREEMENT_PROPOSAL);
 if(typeof input.note!=="string"||input.note.trim().length<5||input.note.length>1000)throw new Error("Describe el cambio de esta versión.");
 const hash=modelHash(definition),id=randomUUID();
 const {creditAgreementPdf}=await import("./credit-agreement-pdf");const sample=Buffer.from(await creditAgreementPdf(specimen(definition,id,hash)));
 const db=await clientPool().connect();try{await db.query("BEGIN");await db.query(`INSERT INTO ${t("oc_client_agreement_models")}(id,identifier,version,definition,content_hash,sample_pdf,sample_hash,created_by,change_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,definition.identifier,definition.version,JSON.stringify(definition),hash,sample,createHash("sha256").update(sample).digest("hex"),actor,input.note.trim()]);await db.query(`INSERT INTO ${t("oc_client_agreement_model_events")}(model_id,to_status,actor,note) VALUES($1,'draft',$2,$3)`,[id,actor,input.note.trim()]);await db.query("COMMIT");return id;}catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
export async function transitionAgreementModel(input:Record<string,unknown>,actor:string){
 if(typeof input.id!=="string"||input.id.length>120||typeof input.note!=="string"||input.note.trim().length<5||input.note.length>1000)throw new Error("Indica modelo y motivo de la revisión.");
 const db=await clientPool().connect();try{await db.query("BEGIN");const r=await db.query(`SELECT * FROM ${t("oc_client_agreement_models")} WHERE id=$1 FOR UPDATE`,[input.id]);const row=r.rows[0] as ModelRow|undefined;if(!row)throw new Error("Modelo no encontrado.");
 const allowed={draft:"pending",pending:"approved",approved:"retired",retired:null};if(allowed[row.status]!==input.status)throw new Error("Transición no permitida.");
 if(input.status==="approved"){
 if(input.reviewedSample!==true||input.reviewedLegal!==true||input.reviewedPrint!==true)throw new Error("Revisa contenido jurídico, PDF de muestra e impresión al 100 % antes de aprobar.");
 if(modelHash(validateAgreementModel(row.definition))!==row.content_hash||createHash("sha256").update(r.rows[0].sample_pdf).digest("hex")!==row.sample_hash)throw new Error("La integridad del modelo o muestra no coincide.");
 }
 await db.query(`UPDATE ${t("oc_client_agreement_models")} SET status=$2,approved_by=CASE WHEN $2='approved' THEN $3 ELSE approved_by END,approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END WHERE id=$1`,[row.id,input.status,actor]);
 await db.query(`INSERT INTO ${t("oc_client_agreement_model_events")}(model_id,from_status,to_status,actor,note) VALUES($1,$2,$3,$4,$5)`,[row.id,row.status,input.status,actor,input.note.trim()]);await db.query("COMMIT");
 }catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
export async function modelSample(id:string){const r=await clientPool().query(`SELECT sample_pdf,sample_hash FROM ${t("oc_client_agreement_models")} WHERE id=$1`,[id]);if(!r.rows[0])return null;const {sample_pdf:bytes,sample_hash:hash}=r.rows[0];if(createHash("sha256").update(bytes).digest("hex")!==hash)throw new Error("Integridad de muestra no válida.");return bytes as Buffer;}
