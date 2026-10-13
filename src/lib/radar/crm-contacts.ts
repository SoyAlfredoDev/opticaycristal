import "server-only";
import { createHash } from "node:crypto";
import { ensureCrmSchema, crmSql } from "./crm-schema";
import { emailAddress } from "./crm-validation";

export function normalizedContactEmails(values: string[]) {
  return [...new Set(values.flatMap(value => {
    try { return [emailAddress(value.trim())]; } catch { return []; }
  }))];
}

/** Sync known addresses without recording or manufacturing consent evidence. */
export async function syncProspectContacts(prospect: { id: string; emails?: string[] }) {
  const emails = normalizedContactEmails(prospect.emails || []);
  if (!emails.length) return;
  await ensureCrmSchema();
  const sql = crmSql();
  for (const email of emails) {
    const id = "radar:" + createHash("md5").update(`${prospect.id}:${email}`).digest("hex");
    await sql`WITH added AS (
      INSERT INTO radar_crm_contacts(id,prospect_id,email,status)
      VALUES(${id},${prospect.id},${email},CASE WHEN EXISTS(SELECT 1 FROM radar_crm_suppressions WHERE email=${email}) THEN 'unsubscribed' ELSE 'active' END)
      ON CONFLICT(prospect_id,email) DO UPDATE SET status=CASE
        WHEN radar_crm_contacts.status='unsubscribed' OR EXCLUDED.status='unsubscribed' THEN 'unsubscribed'
        ELSE 'active' END RETURNING id,status
    ) INSERT INTO radar_crm_events(id,prospect_id,kind,source,metadata)
      SELECT 'sync:'||added.id,${prospect.id},'contact.created','radar',jsonb_build_object('email',${email}::text,'status',added.status)
      FROM added ON CONFLICT(id) DO NOTHING`;
  }
}
