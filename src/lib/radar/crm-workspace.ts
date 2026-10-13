import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { crmSql, ensureCrmSchema } from "./crm-schema";
import { RadarApiError } from "./api";
import { requiredText, enumText, dateValue } from "./crm-validation";
import { marketingEnabled } from "./crm-settings";
import { campaignTemplate } from "./campaign-templates";
import {
  relationshipLabels,
  followupLabels,
  type WorkspaceData,
} from "./workspace-model";

export async function workspaceSnapshot(
  q = "",
  relation = "",
  page = 0,
): Promise<WorkspaceData> {
  await ensureCrmSchema();
  const sql = crmSql();
  const [companies, totals, followups] = await Promise.all([
    sql`SELECT p.id,p.name,p.address,p.phone,p.website,p.employee_estimate,p.source,p.relationship_status,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'email',c.email,'name',c.name,'status',c.status,'marketing_ready',c.marketing_ready,'suppression_reason',s.reason) ORDER BY c.email) FROM radar_crm_contacts c LEFT JOIN radar_crm_suppressions s ON s.email=c.email WHERE c.prospect_id=p.id),'[]'::jsonb) AS contacts,
      (SELECT count(*)::int FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id WHERE c.prospect_id=p.id AND d.sent_at IS NOT NULL) AS sent_count,
      (SELECT max(d.sent_at) FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id WHERE c.prospect_id=p.id) AS last_sent_at
      FROM radar_prospects p WHERE (${relation}='' OR p.relationship_status=${relation}) AND (${q}='' OR strpos(lower(p.name),lower(${q}))>0 OR EXISTS(SELECT 1 FROM radar_crm_contacts c WHERE c.prospect_id=p.id AND strpos(lower(c.email),lower(${q}))>0))
      ORDER BY EXISTS(SELECT 1 FROM radar_crm_contacts c WHERE c.prospect_id=p.id) DESC,p.name,p.id LIMIT 51 OFFSET ${page * 50}`,
    sql`SELECT (SELECT count(*)::int FROM radar_prospects) AS companies,
      (SELECT count(DISTINCT prospect_id)::int FROM radar_crm_contacts) AS "withEmail",
      (SELECT count(DISTINCT email)::int FROM radar_crm_contacts) AS "uniqueEmails",
      (SELECT count(DISTINCT c.email)::int FROM radar_crm_contacts c WHERE c.marketing_ready AND c.status IN ('active','subscribed') AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email)) AS ready,
      (SELECT count(DISTINCT email)::int FROM radar_crm_contacts WHERE NOT marketing_ready AND status IN ('active','subscribed')) AS pending,
      (SELECT count(*)::int FROM radar_crm_deliveries WHERE sent_at IS NOT NULL) AS sent,
      (SELECT count(DISTINCT delivery_id)::int FROM radar_crm_events WHERE kind='email.delivered') AS delivered,
      (SELECT count(*)::int FROM radar_crm_deliveries d WHERE EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.delivered') AND NOT EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.opened')) AS "noOpen",
      (SELECT count(*)::int FROM radar_crm_deliveries d WHERE d.status='failed' OR EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.bounced')) AS rejected,
      (SELECT count(DISTINCT delivery_id)::int FROM radar_crm_events WHERE kind='email.opened') AS opened,
      (SELECT count(DISTINCT delivery_id)::int FROM radar_crm_events WHERE kind='email.clicked' AND metadata->>'primary'='true' AND metadata->>'suspectedAutomation'='false') AS clicked,
      (SELECT count(DISTINCT prospect_id)::int FROM radar_crm_followups WHERE source='email' AND status NOT IN ('automatic','quarantine')) AS replied,
      (SELECT count(DISTINCT prospect_id)::int FROM radar_crm_followups WHERE status IN ('interested','proposal')) AS interested,
      (SELECT count(*)::int FROM radar_crm_followups WHERE status IN ('new','working','interested','proposal','quarantine')) AS followups,
      (SELECT count(DISTINCT email)::int FROM radar_crm_suppressions WHERE reason='email.bounced') AS bounced,
      (SELECT count(DISTINCT email)::int FROM radar_crm_suppressions WHERE reason='unsubscribe') AS unsubscribed`,
    sql`SELECT f.*,p.name AS company_name,c.email FROM radar_crm_followups f JOIN radar_prospects p ON p.id=f.prospect_id LEFT JOIN radar_crm_contacts c ON c.id=f.contact_id ORDER BY (f.status IN ('new','working','interested','proposal','quarantine')) DESC,f.due_at,f.id LIMIT 101`,
  ]);
  return {
    companies: companies.slice(0, 50),
    page,
    hasMore: companies.length > 50,
    kpis: totals[0],
    followups: followups.slice(0, 100),
    followupsTruncated: followups.length > 100,
    configuration: {
      inboundReady: process.env.RADAR_INBOUND_READY === "true",
      inboundDomain: process.env.RADAR_INBOUND_DOMAIN || "",
      sendingEnabled: await marketingEnabled(),
    },
  } as unknown as WorkspaceData;
}

export async function workspaceAction(
  body: Record<string, unknown>,
  actor: string,
) {
  await ensureCrmSchema();
  const sql = crmSql(),
    action = requiredText(body, "action");
  if (action === "sendingSetting") {
    if (typeof body.enabled !== "boolean")
      throw new RadarApiError("Indica si deseas habilitar envíos.");
    await sql`INSERT INTO radar_crm_settings(key,value) VALUES('sending_enabled',${JSON.stringify(body.enabled)}::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`;
    await sql`INSERT INTO radar_crm_events(id,kind,source,metadata) VALUES(${randomUUID()},'marketing.activation',${actor},${JSON.stringify({ enabled: body.enabled })}::jsonb)`;
    return { ok: true };
  }
  if (action === "contactReady") {
    const id = requiredText(body, "id", 100);
    if (typeof body.ready !== "boolean")
      throw new RadarApiError("Indica si la llamada habilita marketing.");
    const rows =
      await sql`UPDATE radar_crm_contacts c SET marketing_ready=${body.ready},ready_at=CASE WHEN ${body.ready} THEN now() ELSE c.ready_at END WHERE id=${id} AND c.status IN ('active','subscribed') AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email) RETURNING prospect_id,email`;
    if (!rows.length)
      throw new RadarApiError("Contacto no disponible o dado de baja.", 409);
    await sql`INSERT INTO radar_crm_events(id,prospect_id,kind,source,metadata) VALUES(${randomUUID()},${rows[0].prospect_id},'contact.readiness',${actor},${JSON.stringify({ email: rows[0].email, ready: body.ready, externalCallRecords: true })}::jsonb)`;
    if (!body.ready)
      await sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Contacto deshabilitado' WHERE contact_id=${id} AND status='queued'`;
    return { ok: true };
  }
  if (action === "relationship") {
    const id = requiredText(body, "id", 100),
      status = enumText(body, "status", Object.keys(relationshipLabels));
    const rows =
      await sql`UPDATE radar_prospects SET relationship_status=${status} WHERE id=${id} RETURNING id`;
    if (!rows.length) throw new RadarApiError("Empresa no encontrada.", 404);
    return { ok: true };
  }
  if (action === "followup") {
    const id = requiredText(body, "id", 100),
      status = enumText(body, "status", Object.keys(followupLabels)),
      owner = requiredText(body, "owner", 200),
      next = requiredText(body, "nextAction", 1000),
      due = dateValue(body.dueAt, true)!;
    const rows =
      await sql`UPDATE radar_crm_followups SET status=${status},owner=${owner},next_action=${next},due_at=${due}::timestamptz,updated_at=now() WHERE id=${id} RETURNING prospect_id,delivery_id,contact_id`;
    if (!rows.length)
      throw new RadarApiError("Seguimiento no encontrado.", 404);
    if (status === "not_interested")
      await sql.transaction([
        sql`UPDATE radar_crm_contacts SET marketing_ready=false WHERE prospect_id=${rows[0].prospect_id}`,
        sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Cliente sin interés; marketing pausado' WHERE status='queued' AND contact_id IN(SELECT id FROM radar_crm_contacts WHERE prospect_id=${rows[0].prospect_id})`,
      ]);
    await sql`INSERT INTO radar_crm_events(id,prospect_id,delivery_id,kind,source,metadata) VALUES(${randomUUID()},${rows[0].prospect_id},${rows[0].delivery_id},'followup.updated',${actor},${JSON.stringify({ id, status, owner, nextAction: next })}::jsonb)`;
    return { ok: true };
  }
  if (action === "enrollSegment") {
    const campaign = requiredText(body, "campaignId", 100),
      relation = enumText(body, "relation", [
        "all",
        ...Object.keys(relationshipLabels),
      ]);
    const rows =
      await sql`WITH campaign AS (SELECT id,variants FROM radar_crm_campaigns WHERE id=${campaign} AND status IN ('draft','approved','paused')), contacts AS (SELECT DISTINCT ON(c.email) c.id,c.email FROM radar_crm_contacts c JOIN radar_prospects p ON p.id=c.prospect_id WHERE c.marketing_ready AND c.status IN ('active','subscribed') AND (${relation}='all' OR p.relationship_status=${relation}) AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email) AND NOT EXISTS(SELECT 1 FROM radar_crm_followups f WHERE f.prospect_id=p.id AND f.status IN ('new','working','interested','proposal','quarantine')) ORDER BY c.email,c.id) INSERT INTO radar_crm_deliveries(id,campaign_id,contact_id,variant_id,token,recipient_email) SELECT gen_random_uuid()::text,ca.id,c.id,ca.variants->(abs(('x'||substr(md5(ca.id||c.email),1,7))::bit(28)::int)%jsonb_array_length(ca.variants))->>'id',gen_random_uuid()::text,c.email FROM contacts c CROSS JOIN campaign ca ON CONFLICT DO NOTHING RETURNING id`;
    return { created: rows.length };
  }
  if (action === "seedMonthly") {
    const month = requiredText(body, "month", 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new RadarApiError("Mes inválido.");

    for (const templateId of ["jornada", "jornada_seguimiento"]) {
      const t = campaignTemplate(templateId),
        id = createHash("sha256")
          .update(`monthly:${month}:${templateId}`)
          .digest("hex")
          .slice(0, 32);
      await sql`INSERT INTO radar_crm_campaigns(id,name,objective,subject,body,variants,template_id,month,expires_at) VALUES(${id},${`${month} · ${t.name}`},'jornada',${t.subject},${t.body},${JSON.stringify([{ id: "web", kind: "web", label: t.cta, destination: "" }])}::jsonb,${t.id},${month},((${month}||'-01')::date+interval '1 month') AT TIME ZONE 'America/Santiago') ON CONFLICT(id) DO NOTHING`;
    }
    return { ok: true };
  }
  if (action === "campaignSchedule") {
    const id = requiredText(body, "id", 100),
      start = dateValue(body.scheduledAt, true)!,
      month = requiredText(body, "month", 7);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date(start));
    const localMonth = `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || localMonth !== month)
      throw new RadarApiError("La fecha debe estar dentro del mes indicado.");

    const rows =
      await sql`UPDATE radar_crm_campaigns SET scheduled_at=${start}::timestamptz,expires_at=((${month}||'-01')::date+interval '1 month') AT TIME ZONE 'America/Santiago',month=${month} WHERE id=${id} AND status<>'archived' RETURNING id`;
    if (!rows.length) throw new RadarApiError("Campaña no disponible.", 404);
    return { ok: true };
  }
  throw new RadarApiError("Acción no reconocida.");
}
