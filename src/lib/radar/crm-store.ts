import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { ensureCrmSchema, crmSql } from "./crm-schema";
import { RadarApiError } from "./api";
import { getProspect } from "./db";
import { dealStages, type CrmSnapshot, type CrmCampaign } from "./crm-model";
import { campaignTemplates } from "./campaign-templates";
import {
  requiredText,
  optionalText,
  enumText,
  emailAddress,
  dateValue,
  campaignVariants,
} from "./crm-validation";

export function marketingConfiguration() {
  const keys = [
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "RADAR_PUBLIC_URL",
    "RADAR_MAIL_FROM",
    "RADAR_MAIL_REPLY_TO",
    "RADAR_MAIL_COMPANY_ADDRESS",
  ];
  const missing = keys.filter((k) => !process.env[k]?.trim());
  if (process.env.RADAR_RESEND_TRACKING_READY !== "true")
    missing.push("RADAR_RESEND_TRACKING_READY");
  return {
    resend: !!process.env.RESEND_API_KEY?.trim(),
    webhook: !!process.env.RESEND_WEBHOOK_SECRET?.trim(),
    publicUrl: /^https:\/\//.test(process.env.RADAR_PUBLIC_URL || ""),
    sendingEnabled: process.env.RADAR_MARKETING_ENABLED === "true",
    missing,
  };
}
export function publicBase() {
  const raw = process.env.RADAR_PUBLIC_URL?.trim();
  if (!raw)
    throw new RadarApiError(
      "Configura RADAR_PUBLIC_URL con una URL HTTPS pública.",
      503,
    );
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash ||
    u.hostname === "localhost" ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)
  )
    throw new RadarApiError(
      "RADAR_PUBLIC_URL debe ser un origen HTTPS público sin rutas.",
      503,
    );
  return u.origin;
}
export async function crmSnapshot(
  prospectId: string | null,
): Promise<CrmSnapshot> {
  await ensureCrmSchema();
  const sql = crmSql();
  const [
    companies,
    contacts,
    tasks,
    deals,
    campaigns,
    deliveries,
    events,
    metrics,
  ] = await Promise.all([
    sql`SELECT id,name FROM radar_prospects ORDER BY name LIMIT 5001`,
    sql`SELECT c.*,s.reason AS suppression_reason FROM radar_crm_contacts c LEFT JOIN radar_crm_suppressions s ON s.email=c.email WHERE (${prospectId}::text IS NULL OR c.prospect_id=${prospectId}) ORDER BY c.created_at DESC LIMIT 201`,
    sql`SELECT t.*,p.name AS company_name FROM radar_crm_tasks t JOIN radar_prospects p ON p.id=t.prospect_id WHERE (${prospectId}::text IS NULL OR t.prospect_id=${prospectId}) ORDER BY (t.status='pending') DESC,t.due_at LIMIT 201`,
    sql`SELECT d.*,p.name AS company_name FROM radar_crm_deals d JOIN radar_prospects p ON p.id=d.prospect_id WHERE (${prospectId}::text IS NULL OR d.prospect_id=${prospectId}) ORDER BY d.updated_at DESC LIMIT 201`,
    sql`SELECT * FROM radar_crm_campaigns ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT d.id,d.campaign_id,d.contact_id,d.variant_id,d.status,d.error,d.created_at,d.provider_id,c.email,p.name AS company_name FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id JOIN radar_prospects p ON p.id=c.prospect_id WHERE (${prospectId}::text IS NULL OR c.prospect_id=${prospectId}) ORDER BY d.created_at DESC LIMIT 201`,
    sql`SELECT e.*,p.name AS company_name FROM (SELECT id,delivery_id,prospect_id,kind,source,occurred_at,metadata FROM radar_crm_events UNION ALL SELECT 'legacy:'||id,NULL::text,prospect_id,'activity.'||kind,'admin',created_at,jsonb_build_object('note',note) FROM radar_activities) e LEFT JOIN radar_prospects p ON p.id=e.prospect_id WHERE (${prospectId}::text IS NULL OR e.prospect_id=${prospectId}) ORDER BY e.occurred_at DESC LIMIT 201`,
    sql`WITH flags AS (SELECT d.*,c.prospect_id,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.delivered') AS delivered,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.opened') AS opened,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.clicked' AND e.metadata->>'primary'='true' AND e.metadata->>'suspectedAutomation'='false') AS clicked,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='cta.redirect' AND e.metadata->>'suspectedAutomation'='false') AS redirected,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='conversation') AS conversation,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.bounced') AS bounced,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='email.complained') AS complained,EXISTS(SELECT 1 FROM radar_crm_events e WHERE e.delivery_id=d.id AND e.kind='unsubscribe') AS unsubscribed FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id) SELECT f.campaign_id,f.variant_id,v->>'kind' AS kind,count(*)::int AS assigned,count(*) FILTER(WHERE f.sent_at IS NOT NULL)::int AS sent,count(*) FILTER(WHERE f.delivered)::int AS delivered,count(*) FILTER(WHERE f.opened)::int AS opened,count(*) FILTER(WHERE f.clicked)::int AS clicked,count(*) FILTER(WHERE f.redirected)::int AS redirected,count(*) FILTER(WHERE f.conversation)::int AS conversations,count(*) FILTER(WHERE f.bounced)::int AS bounced,count(*) FILTER(WHERE f.complained)::int AS complained,count(*) FILTER(WHERE f.unsubscribed)::int AS unsubscribed,count(*) FILTER(WHERE f.conversation AND EXISTS(SELECT 1 FROM radar_crm_deals d WHERE d.prospect_id=f.prospect_id AND d.stage='ganado' AND d.updated_at>=f.sent_at))::int AS won FROM flags f JOIN radar_crm_campaigns ca ON ca.id=f.campaign_id CROSS JOIN LATERAL jsonb_array_elements(ca.variants) v WHERE v->>'id'=f.variant_id GROUP BY f.campaign_id,f.variant_id,v->>'kind'`,
  ]);
  if (companies.length > 5000)
    throw new RadarApiError(
      "El inventario supera el selector del CRM; usa la API paginada de prospectos para elegir empresa.",
      422,
    );
  return {
    companies,
    contacts: contacts.slice(0, 200),
    tasks: tasks.slice(0, 200),
    deals: deals.slice(0, 200),
    campaigns,
    deliveries: deliveries.slice(0, 200),
    events: events.slice(0, 200),
    metrics,
    configuration: marketingConfiguration(),
    truncated: {
      contacts: contacts.length > 200,
      tasks: tasks.length > 200,
      deals: deals.length > 200,
      deliveries: deliveries.length > 200,
      events: events.length > 200,
    },
  } as unknown as CrmSnapshot;
}
export async function crmAction(body: Record<string, unknown>, actor: string) {
  await ensureCrmSchema();
  const sql = crmSql(),
    action = requiredText(body, "action");
  let pid: string | null = null;
  const id = typeof body.id === "string" ? body.id : randomUUID();
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(id))
    throw new RadarApiError("Identificador inválido.");
  const company = async () => {
    pid = requiredText(body, "prospectId", 100);
    if (!(await getProspect(pid)))
      throw new RadarApiError("Empresa no encontrada.", 404);
    return pid;
  };
  const audit = (kind: string, metadata: Record<string, unknown>) =>
    sql`INSERT INTO radar_crm_events(id,prospect_id,kind,source,metadata) VALUES(${`audit:${action}:${id}`},${pid},${kind},${actor},${JSON.stringify(metadata)}::jsonb) ON CONFLICT(id) DO NOTHING`;
  if (action === "contact") {
    await company();
    if (body.consent !== true)
      throw new RadarApiError(
        "Debes registrar el consentimiento explícito del contacto.",
      );
    const consentAt = dateValue(body.consentAt, true)!;
    if (Date.parse(consentAt) > Date.now())
      throw new RadarApiError(
        "La fecha de consentimiento no puede estar en el futuro.",
      );
    const email = emailAddress(requiredText(body, "email", 254)),
      evidence = requiredText(body, "consentEvidence", 1500),
      name = optionalText(body, "name"),
      role = optionalText(body, "role");
    const blocked =
      await sql`SELECT 1 FROM radar_crm_suppressions WHERE email=${email}`;
    if (blocked.length)
      throw new RadarApiError(
        "Este correo está dado de baja, rebotado o bloqueado. No puede reactivarse desde este formulario.",
        409,
      );
    await sql`WITH added AS (INSERT INTO radar_crm_contacts(id,prospect_id,email,name,role,consent_evidence,consented_at) VALUES(${id},${pid},${email},${name},${role},${evidence},${consentAt}::timestamptz) ON CONFLICT(prospect_id,email) DO NOTHING RETURNING id) INSERT INTO radar_crm_events(id,prospect_id,kind,source,metadata) SELECT ${`contact-consent:${id}`},${pid},'contact.consent',${actor},${JSON.stringify({ email, evidence, consentAt })}::jsonb FROM added`;
    const stored =
      await sql`SELECT id FROM radar_crm_contacts WHERE prospect_id=${pid} AND email=${email}`;
    return { id: stored[0].id };
  }
  if (action === "task") {
    await company();
    const title = requiredText(body, "title", 300),
      owner = requiredText(body, "owner"),
      due = dateValue(body.dueAt, true);
    await sql.transaction([
      sql`INSERT INTO radar_crm_tasks(id,prospect_id,title,owner,due_at) VALUES(${id},${pid},${title},${owner},${due}::timestamptz) ON CONFLICT(id) DO NOTHING`,
      audit("task.created", { id, title, owner, dueAt: due }),
    ]);
    return { id };
  }
  if (action === "taskStatus") {
    const status = enumText(body, "status", ["done", "cancelled"]),
      result = requiredText(body, "result", 2000);
    const task = await sql`SELECT * FROM radar_crm_tasks WHERE id=${id}`;
    if (!task.length) throw new RadarApiError("Tarea no encontrada.", 404);
    pid = String(task[0].prospect_id);
    await sql.transaction([
      sql`UPDATE radar_crm_tasks SET status=${status},result=${result},updated_at=now() WHERE id=${id} AND status='pending'`,
      audit("task.completed", { id, status, result }),
    ]);
    return { id };
  }
  if (action === "deal") {
    await company();
    const title = requiredText(body, "title"),
      owner = requiredText(body, "owner"),
      next = requiredText(body, "nextAction", 500),
      offering = enumText(body, "offering", ["convenio", "jornada", "ambas"]),
      close = dateValue(body.closeDate);
    const amount = Number(body.amount || 0);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 99999999999999)
      throw new RadarApiError("Monto CLP inválido.");
    await sql.transaction([
      sql`INSERT INTO radar_crm_deals(id,prospect_id,title,owner,next_action,offering,amount,close_date) VALUES(${id},${pid},${title},${owner},${next},${offering},${amount},${close}::date) ON CONFLICT(id) DO NOTHING`,
      audit("deal.created", { id, title, offering, amount }),
    ]);
    return { id };
  }
  if (action === "dealStage") {
    const stage = enumText(body, "stage", dealStages),
      next = requiredText(body, "nextAction", 500),
      reason = optionalText(body, "lossReason", 1000);
    if (stage === "perdido" && !reason)
      throw new RadarApiError("Indica por qué se perdió la oportunidad.");
    const version = Number(body.version);
    if (!Number.isInteger(version) || version < 1)
      throw new RadarApiError("Versión de oportunidad inválida.");
    const deal = await sql`SELECT * FROM radar_crm_deals WHERE id=${id}`;
    if (!deal.length)
      throw new RadarApiError("Oportunidad no encontrada.", 404);
    pid = String(deal[0].prospect_id);
    const rows =
      await sql`WITH updated AS (UPDATE radar_crm_deals SET stage=${stage},next_action=${next},loss_reason=${reason},version=version+1,updated_at=now() WHERE id=${id} AND version=${version} RETURNING *) INSERT INTO radar_crm_events(id,prospect_id,kind,source,metadata) SELECT ${randomUUID()},prospect_id,'deal.stage',${actor},${JSON.stringify({ id, stage, nextAction: next, lossReason: reason })}::jsonb FROM updated RETURNING id`;
    if (!rows.length)
      throw new RadarApiError(
        "La oportunidad cambió. Actualiza antes de editar.",
        409,
      );
    return { id };
  }
  if (action === "campaign" || action === "campaignUpdate") {
    const name = requiredText(body, "name"),
      objective = enumText(body, "objective", ["convenio", "jornada", "ambas"]),
      subject = requiredText(body, "subject", 150),
      text = requiredText(body, "body", 5000),
      variants = campaignVariants(body.variants);
    const templateId = body.templateId === undefined ? (objective === "ambas" ? "presentacion" : objective) : enumText(body, "templateId", campaignTemplates.map(t => t.id));
    if (/[\r\n]/.test(subject) || /(https?:\/\/|mailto:|www\.)/i.test(text))
      throw new RadarApiError(
        "Asunto sin saltos de línea y cuerpo sin enlaces: utiliza el CTA principal.",
      );
    if (action === "campaignUpdate") {
      const updated =
        await sql`WITH updated AS (UPDATE radar_crm_campaigns SET name=${name},objective=${objective},subject=${subject},body=${text},variants=${JSON.stringify(variants)}::jsonb,template_id=${templateId} WHERE id=${id} AND status='draft' AND NOT EXISTS(SELECT 1 FROM radar_crm_deliveries WHERE campaign_id=${id}) RETURNING id) INSERT INTO radar_crm_events(id,kind,source,metadata) SELECT ${randomUUID()},'campaign.edited',${actor},${JSON.stringify({ id, name })}::jsonb FROM updated RETURNING id`;
      if (!updated.length)
        throw new RadarApiError(
          "Solo puedes editar un borrador sin destinatarios preparados. Crea una nueva campaña para otro experimento.",
          409,
        );
      return { id };
    }
    await sql.transaction([
      sql`INSERT INTO radar_crm_campaigns(id,name,objective,subject,body,variants,template_id) VALUES(${id},${name},${objective},${subject},${text},${JSON.stringify(variants)}::jsonb,${templateId}) ON CONFLICT(id) DO NOTHING`,
      audit("campaign.created", { id, name }),
    ]);
    return { id };
  }
  if (action === "campaignStatus") {
    const status = enumText(body, "status", ["approved", "paused", "archived"]);
    const rows =
      await sql`WITH updated AS (UPDATE radar_crm_campaigns SET status=${status},approved_at=CASE WHEN ${status}='approved' THEN now() ELSE approved_at END WHERE id=${id} AND status<>'archived' RETURNING id) INSERT INTO radar_crm_events(id,kind,source,metadata) SELECT ${randomUUID()},'campaign.status',${actor},${JSON.stringify({ id, status })}::jsonb FROM updated RETURNING id`;
    if (!rows.length)
      throw new RadarApiError("Campaña no encontrada o archivada.", 404);
    return { id };
  }
  if (action === "enroll") {
    const campaignId = requiredText(body, "campaignId", 100);
    const rows =
      await sql`SELECT * FROM radar_crm_campaigns WHERE id=${campaignId} AND status IN ('draft','approved','paused')`;
    if (!rows.length) throw new RadarApiError("Campaña no disponible.", 404);
    const campaign = rows[0] as unknown as CrmCampaign;
    const ids = body.contactIds;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 100 ||
      ids.some((v) => typeof v !== "string")
    )
      throw new RadarApiError("Selecciona de 1 a 100 contactos.");
    const contacts =
      await sql`SELECT c.id,c.prospect_id,c.email FROM radar_crm_contacts c WHERE c.id=ANY(${ids}::text[]) AND c.status='subscribed' AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email)`;
    if (contacts.length !== new Set(ids).size)
      throw new RadarApiError(
        "Hay contactos sin autorización vigente o bloqueados.",
      );
    const queries = contacts.map((c) => {
      const n =
        createHash("sha256")
          .update(`${campaignId}:${c.email}`)
          .digest()
          .readUInt32BE(0) % campaign.variants.length;
      return sql`INSERT INTO radar_crm_deliveries(id,campaign_id,contact_id,variant_id,token,recipient_email) VALUES(${randomUUID()},${campaignId},${c.id},${campaign.variants[n].id},${randomUUID()},${c.email}) ON CONFLICT DO NOTHING RETURNING id`;
    });
    const added = await sql.transaction(queries);
    return {
      created: added.reduce((n, r) => n + r.length, 0),
      eligible: contacts.length,
    };
  }
  if (action === "conversation") {
    await company();
    const deliveryId = optionalText(body, "deliveryId", 100),
      note = requiredText(body, "note", 2000);
    if (deliveryId) {
      const d =
        await sql`SELECT d.id FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id WHERE d.id=${deliveryId} AND c.prospect_id=${pid} AND d.sent_at IS NOT NULL`;
      if (!d.length)
        throw new RadarApiError(
          "El envío no corresponde a la empresa o todavía no se envió.",
        );
    }
    await sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,metadata) VALUES(${id},${deliveryId || null},${pid},'conversation',${actor},${JSON.stringify({ note, confirmed: true })}::jsonb) ON CONFLICT(id) DO NOTHING`;
    return { id };
  }
  if (action === "insight") {
    const campaignId = requiredText(body, "campaignId", 100),
      note = requiredText(body, "note", 3000),
      basis = requiredText(body, "basis", 2000),
      nextExperiment = requiredText(body, "nextExperiment", 1000);
    const campaign =
      await sql`SELECT id FROM radar_crm_campaigns WHERE id=${campaignId}`;
    if (!campaign.length)
      throw new RadarApiError("Campaña no encontrada.", 404);
    await sql`INSERT INTO radar_crm_events(id,kind,source,metadata) VALUES(${id},'campaign.insight',${actor},${JSON.stringify({ campaignId, note, basis, nextExperiment, label: "Hipótesis o interpretación, requiere evidencia" })}::jsonb) ON CONFLICT(id) DO NOTHING`;
    return { id };
  }
  throw new RadarApiError("Acción CRM no reconocida.");
}
export async function deliveryByToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  await ensureCrmSchema();
  const sql = crmSql();
  const rows =
    await sql`SELECT d.*,c.email,c.prospect_id,c.name AS contact_name,c.status AS contact_status,ca.name AS campaign_name,ca.objective,ca.subject,ca.body,ca.variants,p.name AS company_name FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id JOIN radar_crm_campaigns ca ON ca.id=d.campaign_id JOIN radar_prospects p ON p.id=c.prospect_id WHERE d.token=${token} AND d.sent_at IS NOT NULL LIMIT 1`;
  return rows[0] || null;
}
export async function unsubscribeDelivery(token: string) {
  const d = await deliveryByToken(token);
  if (!d) throw new RadarApiError("Enlace no disponible.", 404);
  const sql = crmSql();
  await sql.transaction([
    sql`INSERT INTO radar_crm_suppressions(email,reason) VALUES(${d.email},'unsubscribe') ON CONFLICT(email) DO NOTHING`,
    sql`UPDATE radar_crm_contacts SET status='unsubscribed' WHERE email=${d.email}`,
    sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Baja solicitada' WHERE status='queued' AND contact_id IN (SELECT id FROM radar_crm_contacts WHERE email=${d.email})`,
    sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source) VALUES(${`unsubscribe:${d.id}`},${d.id},${d.prospect_id},'unsubscribe','recipient') ON CONFLICT(id) DO NOTHING`,
  ]);
  return true;
}
