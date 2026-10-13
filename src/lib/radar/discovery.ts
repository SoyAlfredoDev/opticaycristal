import "server-only";
import { enrichCompanyWebsite } from "./website";
import { crmSql, ensureCrmSchema } from "./crm-schema";
import { publicWebUrl } from "./public-web";
import type { CompanyResult } from "./types";
import type { WebEnrichment } from "./db";
export async function discoverEmail(company: CompanyResult) {
  if (!company.website) return company;
  const website = publicWebUrl(company.website).toString();
  await ensureCrmSchema();
  const sql = crmSql();
  const rows =
    await sql`SELECT data FROM radar_crm_web_cache WHERE website=${website} AND checked_at>now()-interval '24 hours'`;
  const facts =
    (rows[0]?.data as WebEnrichment | undefined) ??
    (await enrichCompanyWebsite(company));
  if (!rows.length)
    await sql`INSERT INTO radar_crm_web_cache(website,data) VALUES(${website},${JSON.stringify(facts)}::jsonb) ON CONFLICT(website) DO UPDATE SET data=EXCLUDED.data,checked_at=now()`;
  return {
    ...company,
    emails: [...new Set([...(company.emails || []), ...facts.emails])],
    phone: company.phone || facts.phones[0] || null,
    socialLinks: [
      ...new Set([...(company.socialLinks || []), ...facts.socialLinks]),
    ],
    evidence: [...(company.evidence || []), ...facts.evidence].slice(-200),
    employeeEstimate: facts.employeeEstimate ?? company.employeeEstimate,
    employeeEstimateSource:
      facts.employeeEstimate != null
        ? facts.evidence.find((e) => e.field === "employeeEstimate")?.url
        : company.employeeEstimateSource,
    webCheckedAt: facts.fetchedAt,
    webStatus: facts.status,
  };
}
