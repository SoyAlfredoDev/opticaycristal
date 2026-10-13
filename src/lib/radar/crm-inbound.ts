import "server-only";
import { parse } from "node-html-parser";
import { crmSql, ensureCrmSchema } from "./crm-schema";
import { emailAddress } from "./crm-validation";

export function replyAddress(token: string) {
  const domain = process.env.RADAR_INBOUND_DOMAIN?.trim().toLowerCase();
  if (process.env.RADAR_INBOUND_READY !== "true" || !domain)
    return process.env.RADAR_MAIL_REPLY_TO;
  if (
    !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ||
    !/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      token,
    )
  )
    throw new Error("Configuración de respuestas inválida.");
  return `reply.${token}@${domain}`;
}
export function senderEmail(from: unknown) {
  if (typeof from !== "string") return null;
  try {
    return emailAddress(from.match(/<([^<>]+)>/)?.[1] || from);
  } catch {
    return null;
  }
}
export function replyTokens(recipients: unknown, domain: string) {
  if (!Array.isArray(recipients)) return [];
  return [
    ...new Set(
      recipients.flatMap((value) => {
        const email = senderEmail(value);
        if (!email || email.split("@")[1] !== domain.toLowerCase()) return [];
        const m = email.match(/^reply\.([0-9a-f-]{36})@/);
        return m ? [m[1]] : [];
      }),
    ),
  ];
}
export function plainReply(data: Record<string, unknown>) {
  if (typeof data.text === "string") return data.text.slice(0, 12000);
  if (typeof data.html !== "string" || data.html.length > 200000)
    return "Contenido no disponible en texto.";
  // Resend's html_format describes inline image references, not the encoding of the HTML document.
  let html = data.html;
  if (html.startsWith("data:text/html")) {
    const m = html.match(
      /^data:text\/html(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!m) return "Contenido no disponible en texto.";
    html = Buffer.from(m[1], "base64").toString("utf8");
  }
  const root = parse(html);
  root
    .querySelectorAll("script,style,iframe,object")
    .forEach((n) => n.remove());
  return root.structuredText.slice(0, 12000);
}
export function inboundDisposition(
  data: Record<string, unknown>,
  expected: string,
) {
  const headers = (data.headers || {}) as Record<string, unknown>,
    auth = (data.authentication || {}) as Record<string, unknown>;
  const automatic = Object.entries(headers).some(
    ([key, v]) =>
      /^(auto-submitted|x-autoreply|x-autorespond)$/i.test(key) &&
      typeof v === "string" &&
      v.toLowerCase() !== "no",
  );
  if (automatic) return "automatic";
  return senderEmail(data.from) === expected.toLowerCase() &&
    auth.dmarc === "pass"
    ? "new"
    : "quarantine";
}
export async function ingestInbound(
  eventId: string,
  event: Record<string, unknown>,
) {
  const d = event.data as Record<string, unknown> | undefined;
  if (
    !d ||
    typeof d.email_id !== "string" ||
    !/^[a-zA-Z0-9_-]{10,100}$/.test(d.email_id)
  )
    return { ignored: true };
  await ensureCrmSchema();
  await crmSql()`INSERT INTO radar_crm_inbound(id,event_id,payload) VALUES(${d.email_id},${eventId},${JSON.stringify({ from: d.from, to: d.to, received_for: d.received_for, subject: d.subject, created_at: event.created_at })}::jsonb) ON CONFLICT DO NOTHING`;
  await reconcileInbound();
  return { accepted: true };
}
export async function reconcileInbound() {
  if (
    process.env.RADAR_INBOUND_READY !== "true" ||
    !process.env.RADAR_INBOUND_DOMAIN
  )
    return;
  await ensureCrmSchema();
  const sql = crmSql();
  const pending =
    await sql`SELECT * FROM radar_crm_inbound WHERE processed=false ORDER BY received_at LIMIT 10`;
  for (const row of pending) {
    const p = row.payload as Record<string, unknown>,
      tokens = replyTokens(
        [
          ...(Array.isArray(p.to) ? p.to : []),
          ...(Array.isArray(p.received_for) ? p.received_for : []),
        ],
        process.env.RADAR_INBOUND_DOMAIN,
      );
    const deliveries = tokens.length
      ? await sql`SELECT d.id,d.contact_id,c.email,c.prospect_id FROM radar_crm_deliveries d JOIN radar_crm_contacts c ON c.id=d.contact_id WHERE d.token=ANY(${tokens}::text[]) AND d.sent_at IS NOT NULL LIMIT 2`
      : [];
    if (deliveries.length !== 1) {
      await sql`UPDATE radar_crm_inbound SET processed=true WHERE id=${row.id}`;
      continue;
    }
    const response = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(String(row.id))}?html_format=cid`,
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) continue;
    const data = (await response.json()) as Record<string, unknown>,
      delivery = deliveries[0],
      status = inboundDisposition(data, String(delivery.email)),
      message = plainReply(data),
      subject = String(
        data.subject || p.subject || "Respuesta a propuesta",
      ).slice(0, 300),
      id = `reply:${row.id}`;
    const queries = [
      sql`INSERT INTO radar_crm_followups(id,prospect_id,contact_id,delivery_id,external_id,source,subject,message,status) VALUES(${id},${delivery.prospect_id},${delivery.contact_id},${delivery.id},${row.id},'email',${subject},${message},${status}) ON CONFLICT DO NOTHING`,
      sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,metadata) VALUES(${id},${delivery.id},${delivery.prospect_id},${status === "new" ? "email.replied" : "email.reply_review"},'resend',${JSON.stringify({ subject, status, messageStored: true })}::jsonb) ON CONFLICT DO NOTHING`,
      sql`UPDATE radar_crm_inbound SET processed=true WHERE id=${row.id}`,
    ];
    if (status === "new")
      queries.push(
        sql`INSERT INTO radar_crm_tasks(id,prospect_id,title,owner,due_at) VALUES(${`task:${id}`},${delivery.prospect_id},'Revisar respuesta a campaña y contactar','Equipo comercial',now()+interval '1 day') ON CONFLICT DO NOTHING`,
        sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Respuesta recibida; continuar seguimiento comercial' WHERE status='queued' AND contact_id IN(SELECT id FROM radar_crm_contacts WHERE email=${delivery.email})`,
      );
    await sql.transaction(queries);
  }
}
