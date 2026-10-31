import "server-only";
import { listCustomerSales } from "./sales";
import { clientPool, clientTable } from "./db";
import { normalizeClientRut,validClientRut } from "./validation";
import { clientFingerprint } from "./privacy";
import { revealClientValue } from "./privacy";
import { availableCredit, type CustomerProfile, type CustomerSummary } from "./types";
const select = (withContact = false) => `SELECT ${withContact ? 'u."rutCipher",u."whatsappCipher",' : ""}u.id,u."firstName",u."lastName",u.email,u."emailVerified",u."identityVerified",u."whatsappVerified",u."createdAt",t.code,t.name AS tier_name,t.max_percent,t.max_amount,t.max_installments,COALESCE(b.principal_outstanding,0) AS outstanding FROM ${clientTable("oc_client_user")} u JOIN ${clientTable("oc_client_tiers")} t ON t.code=u.category LEFT JOIN ${clientTable("oc_client_credit_balances")} b ON b.user_id=u.id`;
type Row = Record<string, unknown>;
function summary(r: Row): CustomerSummary {
  const emailVerified = r.emailVerified === true, identityVerified = r.identityVerified === true;
  const needsIdentity = false; // Identity is reviewed in person; it does not replace the required contact verifications.
  const enabled = emailVerified; // WhatsApp is optional by the user’s decision on 2026-10-29.
  return { id: String(r.id), firstName: String(r.firstName), lastName: String(r.lastName), email: String(r.email), emailVerified, identityVerified, whatsappVerified: r.whatsappVerified === true,
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
export async function listCustomerSummaries(search=""):Promise<CustomerSummary[]>{return (await searchCustomerSummaries(search)).customers;}

export async function getCustomerTiers(): Promise<CustomerProfile["tier"][]> {
 const result = await clientPool().query(`SELECT code,name,max_percent,max_amount,max_installments FROM ${clientTable("oc_client_tiers")} ORDER BY position`);
 return result.rows.map(row => ({code:String(row.code),name:String(row.name),maxPercent:Number(row.max_percent),maxAmount:Number(row.max_amount),maxInstallments:Number(row.max_installments)}));
}
