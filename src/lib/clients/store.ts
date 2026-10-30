import "server-only";
import { listCustomerSales } from "./sales";
import { clientPool, clientTable } from "./db";
import { revealClientValue } from "./privacy";
import { availableCredit, type CustomerProfile, type CustomerSummary } from "./types";
const select = () => `SELECT u.id,u."firstName",u."lastName",u.email,u."emailVerified",u."identityVerified",u."whatsappVerified",u."createdAt",t.code,t.name AS tier_name,t.max_percent,t.max_amount,t.max_installments,COALESCE(b.principal_outstanding,0) AS outstanding FROM ${clientTable("oc_client_user")} u JOIN ${clientTable("oc_client_tiers")} t ON t.code=u.category LEFT JOIN ${clientTable("oc_client_credit_balances")} b ON b.user_id=u.id`;
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
  const r = await clientPool().query(`${select()} WHERE u.id=$1`, [userId]);
  if (!r.rows[0]) return null;
  const secret = await clientPool().query(`SELECT "rutCipher","whatsappCipher" FROM ${clientTable("oc_client_user")} WHERE id=$1`, [userId]);
  return { ...summary(r.rows[0]), rut: revealClientValue(secret.rows[0].rutCipher, "rut"), whatsapp: revealClientValue(secret.rows[0].whatsappCipher, "whatsapp"), purchases: await listCustomerSales(userId) };
}
export async function listCustomerSummaries(search = ""): Promise<CustomerSummary[]> {
  const term = search.trim().slice(0, 100).toLowerCase().replace(/[\\%_]/g, "\\$&");
  const rows = await clientPool().query(`${select()} WHERE ($1='' OR lower(u.name) LIKE '%'||$1||'%' OR lower(u.email) LIKE '%'||$1||'%') ORDER BY u."createdAt" DESC,u.id DESC LIMIT 50`, [term]);
  return rows.rows.map(summary);
}

/** Presenta el siguiente nivel; no aplica ascensos ni modifica el cupo actual. */
export async function getNextCustomerTier(currentCode: string): Promise<CustomerProfile["tier"] | null> {
  const result = await clientPool().query(`SELECT code,name,max_percent,max_amount,max_installments FROM ${clientTable("oc_client_tiers")} WHERE position > (SELECT position FROM ${clientTable("oc_client_tiers")} WHERE code=$1) ORDER BY position LIMIT 1`, [currentCode]);
  const row = result.rows[0];
  return row ? { code: String(row.code), name: String(row.name), maxPercent: Number(row.max_percent), maxAmount: Number(row.max_amount), maxInstallments: Number(row.max_installments) } : null;
}
