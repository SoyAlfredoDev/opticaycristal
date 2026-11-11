import "server-only";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import type { PoolClient } from "pg";
import { clientPool,clientTable as t } from "./db";
import { protectClientValue,revealClientValue } from "./privacy";
import type { CreditAgreementDocument } from "./commitments";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function date(v:unknown){if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new Error("Fecha efectiva no válida.");const d=new Date(v+"T12:00:00Z");if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v||v>today())throw new Error("No uses fechas futuras o no válidas.");return v;}
function detail(v:unknown){if(typeof v!=="string"||v.trim().length<3||v.length>500||/[\u0000-\u001f]/.test(v))throw new Error("Completa las constancias y el respaldo legal.");return v.trim();}
export async function recordAgreementAcceptance(db:PoolClient,d:CreditAgreementDocument,raw:Record<string,unknown>,actor:string){
 const existing=await db.query(`SELECT sale_id FROM ${t("oc_client_agreement_acceptances")} WHERE sale_id=$1`,[d.sale.id]);if(existing.rows[0])return;
 const signedOn=date(raw.signedOn),delivered=date(raw.copyDeliveredOn);
 const preparedDate=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d.preparedAt));
 if(signedOn<preparedDate||delivered<signedOn)throw new Error("La firma debe corresponder al documento emitido y la entrega no puede precederla.");
 if(raw.deliveryMethod!=="paper"&&raw.deliveryMethod!=="email"&&raw.deliveryMethod!=="portal")throw new Error("Selecciona el medio de entrega real.");
 const legalLimit=Number(raw.legalAnnualLimit);if(!Number.isFinite(legalLimit)||legalLimit<=0||legalLimit>100||raw.legalLimitChecked!==true||raw.acceptanceChecked!==true)throw new Error("Confirma el documento firmado y el límite legal aplicable al suscribir.");
 const file=raw.signedPdf;if(typeof file!=="string"||!/^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/.test(file)||file.length>2_800_000)throw new Error("Adjunta el PDF íntegro firmado, hasta 2 MB.");
 const bytes=Buffer.from(file.split(",")[1],"base64");if(bytes.length>2_000_000||bytes.subarray(0,5).toString()!=="%PDF-")throw new Error("El respaldo no es un PDF válido.");const pdf=await PDFDocument.load(bytes);if(pdf.getPageCount()<2||pdf.getPageCount()>30)throw new Error("Revisa el respaldo íntegro del contrato.");
 const issued=await db.query(`SELECT pdf_enc,pdf_hash FROM ${t("oc_client_commitments")} WHERE sale_id=$1`,[d.sale.id]);
 const frozen=issued.rows[0];if(!frozen?.pdf_enc)throw new Error("No se encontró el PDF original emitido.");
 const original=Buffer.from(revealClientValue(frozen.pdf_enc,"contract-document"),"base64");
 if(createHash("sha256").update(original).digest("hex")!==frozen.pdf_hash)throw new Error("El original no supera la verificación de integridad.");
 if(pdf.getPageCount()<(await PDFDocument.load(original)).getPageCount())throw new Error("El respaldo tiene menos páginas que el documento emitido.");
 await db.query(`INSERT INTO ${t("oc_client_agreement_acceptances")}(sale_id,signed_on,confirmed_by,copy_delivered_on,delivery_method,delivery_reference,original_reference,signed_pdf_enc,signed_pdf_hash,legal_annual_limit,legal_limit_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[d.sale.id,signedOn,actor,delivered,raw.deliveryMethod,detail(raw.deliveryReference),detail(raw.originalReference),protectClientValue(bytes.toString("base64"),"signed-contract"),createHash("sha256").update(bytes).digest("hex"),legalLimit,detail(raw.legalLimitReference)]);
}
export async function effectiveAgreementDate(d:CreditAgreementDocument,saleId:string,legacySignedAt:string|null,db:Pick<PoolClient,"query">=clientPool()){
 if(!d.model)return legacySignedAt?{date:new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(legacySignedAt)),legalAnnualLimit:d.legalAnnualMaximum}:null;
 const r=await db.query(`SELECT signed_on::text,legal_annual_limit FROM ${t("oc_client_agreement_acceptances")} WHERE sale_id=$1`,[saleId]);return r.rows[0]?{date:String(r.rows[0].signed_on),legalAnnualLimit:Number(r.rows[0].legal_annual_limit)}:null;
}
export async function signedAgreement(saleId:string){const r=await clientPool().query(`SELECT signed_pdf_enc,signed_pdf_hash,signed_on::text,confirmed_at,copy_delivered_on::text,delivery_method,delivery_reference,original_reference FROM ${t("oc_client_agreement_acceptances")} WHERE sale_id=$1`,[saleId]);if(!r.rows[0])return null;const row=r.rows[0],bytes=Buffer.from(revealClientValue(row.signed_pdf_enc,"signed-contract"),"base64");if(createHash("sha256").update(bytes).digest("hex")!==row.signed_pdf_hash)throw new Error("El respaldo no supera la verificación de integridad.");return{bytes,evidence:{...row,signed_pdf_enc:undefined}};}
