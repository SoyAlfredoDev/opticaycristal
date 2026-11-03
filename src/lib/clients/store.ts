import "server-only";
import {kapsoVerificationEnabled} from "@/lib/integrations/kapso-config";
import { listCustomerSales } from "./sales";
import { clientPool, clientTable } from "./db";
import { normalizeClientRut,validClientRut } from "./validation";
import { clientFingerprint } from "./privacy";
import { revealClientValue } from "./privacy";
import { availableCredit, type CustomerProfile, type CustomerSummary, type CustomerSnapshot } from "./types";
const select = (withContact = false, extra = "") => `SELECT ${extra}${withContact ? 'u."rutCipher",u."whatsappCipher",' : ""}u.id,u."firstName",u."lastName",u.email,u."emailVerified",u."identityVerified",u."whatsappVerified",u."createdAt",t.code,t.name AS tier_name,t.max_percent,t.max_amount,t.max_installments,COALESCE(b.principal_outstanding,0) AS outstanding FROM ${clientTable("oc_client_user")} u JOIN ${clientTable("oc_client_tiers")} t ON t.code=u.category LEFT JOIN ${clientTable("oc_client_credit_balances")} b ON b.user_id=u.id`;
type Row = Record<string, unknown>;
function summary(r: Row): CustomerSummary {
  const emailVerified = r.emailVerified === true, identityVerified = r.identityVerified === true;
  const needsIdentity = false; // Identity is reviewed in person; it does not replace the required contact verifications.
  const enabled = emailVerified; // WhatsApp is optional by the user’s decision on 2026-10-29.
  return { id: String(r.id), firstName: String(r.firstName), lastName: String(r.lastName), email: String(r.email), emailVerified, identityVerified, whatsappVerified: r.whatsappVerified === true,whatsappVerificationAvailable:kapsoVerificationEnabled(),
    createdAt: new Date(String(r.createdAt)).toISOString(),
    tier: { code: String(r.code), name: String(r.tier_name), maxAmount: Number(r.max_amount), maxPercent: Number(r.max_percent), maxInstallments: Number(r.max_installments) },
    credit: { principalOutstanding: Number(r.outstanding), ...availableCredit(Number(r.max_amount), Number(r.outstanding), enabled && Number(r.outstanding) === 0), enabled, needsIdentity },
  };
}
export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const r = await clientPool().query(`${select(true)} WHERE u.id=$1`, [userId]);
  if (!r.rows[0]) return null;
  return { ...summary(r.rows[0]), rut: revealClientValue(r.rows[0].rutCipher, "rut"), whatsapp: revealClientValue(r.rows[0].whatsappCipher, "whatsapp"), purchases: await listCustomerSales(userId) };
}
export async function searchCustomerSummaries(search="",offset=0):Promise<{customers:CustomerSummary[];hasMore:boolean}>{
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new Error("Página no válida.");
 const value=search.trim().slice(0,100),term=value.toLowerCase().replace(/[\\%_]/g,"\\$&");
 const rut=normalizeClientRut(value),hash=validClientRut(rut)?clientFingerprint(rut,"rut"):"";
 const result=await clientPool().query(`${select()} WHERE ($1='' OR lower(u.name) LIKE '%'||$1||'%' OR lower(u.email) LIKE '%'||$1||'%' OR ($2<>'' AND u."rutHash"=$2)) ORDER BY u."createdAt" DESC,u.id DESC LIMIT 51 OFFSET $3`,[term,hash,offset]);
 return {customers:result.rows.slice(0,50).map(summary),hasMore:result.rows.length>50};
}

export async function getCustomerTiers(): Promise<CustomerProfile["tier"][]> {
 const result = await clientPool().query(`SELECT code,name,max_percent,max_amount,max_installments FROM ${clientTable("oc_client_tiers")} ORDER BY position`);
 return result.rows.map(row => ({code:String(row.code),name:String(row.name),maxPercent:Number(row.max_percent),maxAmount:Number(row.max_amount),maxInstallments:Number(row.max_installments)}));
}

/** A single database round trip; history belongs to the paged endpoints. */
export async function getCustomerSnapshot(userId: string): Promise<CustomerSnapshot | null> {
 const sales = clientTable("oc_client_sales"), installments = clientTable("oc_client_installments");
 const extra = `
 (SELECT count(*) FROM ${sales} WHERE user_id=u.id) AS purchase_count,
 (SELECT count(*) FROM ${sales} WHERE user_id=u.id AND credit>0) AS credit_count,
 (SELECT jsonb_build_object('dueDate',i.due_date::text,'amount',i.amount,'paid',i.paid)
  FROM ${installments} i JOIN ${sales} s ON s.id=i.sale_id
  WHERE s.user_id=u.id AND s.status='active' AND s.remaining>0 AND i.paid<i.amount
  ORDER BY i.due_date,i.number,i.id LIMIT 1) AS next_installment,
 (SELECT jsonb_agg(jsonb_build_object('code',code,'name',name,'maxPercent',max_percent,'maxAmount',max_amount,'maxInstallments',max_installments) ORDER BY position)
  FROM ${clientTable("oc_client_tiers")}) AS tiers,
 md5(COALESCE(b.updated_at::text,'') || COALESCE((SELECT max(GREATEST(created_at,signed_at,cancelled_at))::text FROM ${sales} WHERE user_id=u.id),'')) AS history_version,
 `;
 const result = await clientPool().query(`${select(true, extra)} WHERE u.id=$1`, [userId]);
 const row = result.rows[0];
 if (!row) return null;
 return { customer: { ...summary(row), rut: revealClientValue(row.rutCipher,"rut"), whatsapp: revealClientValue(row.whatsappCipher,"whatsapp"),
  activity: { purchaseCount:Number(row.purchase_count), creditCount:Number(row.credit_count), nextInstallment:row.next_installment ?? null } },
  tiers:row.tiers ?? [], historyVersion:String(row.history_version) };
}

/** Private integration lookup. Never return contact data directly from an API. */
export async function getCustomerIntegrationContact(rut: string) {
 const normalized = normalizeClientRut(rut);
 if (!validClientRut(normalized)) return null;
 const result = await clientPool().query(`${select(true)} WHERE u."rutHash"=$1`, [clientFingerprint(normalized,"rut")]);
 const row = result.rows[0];
 return row ? { customer:summary(row), whatsapp:revealClientValue(row.whatsappCipher,"whatsapp") } : null;
}
