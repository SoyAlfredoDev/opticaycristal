import "server-only";
import { createHash } from "node:crypto";
import { crmSql, ensureCrmSchema } from "./crm-schema";
import { publicBase, marketingConfiguration } from "./crm-store";
import { escapeEmail, emailAddress } from "./crm-validation";
import { RadarApiError } from "./api";
import type { CampaignVariant } from "./crm-model";
export function automationHint(userAgent: string) {
  return /bot|crawler|spider|preview|scanner|proofpoint|mimecast|barracuda|safelinks|headless/i.test(
    userAgent,
  );
}
export function composeCampaign(input: {
  company: string;
  subject: string;
  body: string;
  variant: CampaignVariant;
  ctaUrl: string;
  unsubscribeUrl: string;
  address: string;
  consent: string;
}) {
  const subject = input.subject
    .replaceAll("{{empresa}}", input.company)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 250);
  const body = input.body.replaceAll("{{empresa}}", input.company);
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6f8;color:#152c40;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:600px;background:white;border-top:4px solid #6B1F3A"><tr><td style="padding:32px"><p style="color:#6B1F3A;font-size:13px;font-weight:bold">ÓPTICA &amp; CRISTAL · BENEFICIOS PARA EMPRESAS</p><h1 style="font-size:24px;line-height:1.3">${escapeEmail(subject)}</h1>${body
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="font-size:16px;line-height:1.7">${escapeEmail(p).replaceAll("\n", "<br>")}</p>`,
    )
    .join(
      "",
    )}<p style="margin:28px 0"><a href="${escapeEmail(input.ctaUrl)}" style="display:inline-block;background:#6B1F3A;color:white;text-decoration:none;border-radius:6px;padding:16px 24px;font-weight:bold">${escapeEmail(input.variant.label)}</a></p><p style="font-size:12px;color:#637384;line-height:1.6">Óptica &amp; Cristal · ${escapeEmail(input.address)}<br>Recibes este mensaje porque autorizaste comunicaciones comerciales de Óptica &amp; Cristal.<br><a href="${escapeEmail(input.unsubscribeUrl)}" style="color:#637384">Darme de baja</a></p></td></tr></table></td></tr></table></body></html>`;
  return {
    subject,
    html,
    text: `Óptica & Cristal\n\n${subject}\n\n${body}\n\n${input.variant.label}: ${input.ctaUrl}\n\nÓptica & Cristal · ${input.address}\nRecibes este mensaje por tu autorización de comunicaciones comerciales.\nDarme de baja: ${input.unsubscribeUrl}`,
  };
}
export async function dispatchCampaign(campaignId: string) {
  const configuration = marketingConfiguration();
  if (!configuration.sendingEnabled || configuration.missing.length)
    throw new RadarApiError(
      `Envío no habilitado. Revisa configuración: ${configuration.missing.join(", ") || "RADAR_MARKETING_ENABLED"}.`,
      503,
    );
  const base = publicBase();
  emailAddress(process.env.RADAR_MAIL_REPLY_TO!);
  const from = process.env.RADAR_MAIL_FROM!;
  if (/[\r\n]/.test(from)) throw new RadarApiError("Remitente inválido.", 503);
  emailAddress(from.match(/<([^<>]+)>/)?.[1] || from);
  await ensureCrmSchema();
  const sql = crmSql();
  // A request interrupted after acceptance is never retried automatically beyond Resend's 24h idempotency window.
  await sql`UPDATE radar_crm_deliveries SET status='uncertain',error='Envío interrumpido: reconciliar con Resend antes de reintentar' WHERE status='sending' AND attempted_at<now()-interval '5 minutes'`;
  await sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Contacto no autorizado o bloqueado' WHERE status='queued' AND (contact_id IN (SELECT id FROM radar_crm_contacts WHERE status<>'subscribed') OR contact_id IN (SELECT c.id FROM radar_crm_contacts c JOIN radar_crm_suppressions s ON s.email=c.email))`;
  const queue =
    await sql`SELECT d.id FROM radar_crm_deliveries d JOIN radar_crm_campaigns ca ON ca.id=d.campaign_id WHERE d.campaign_id=${campaignId} AND d.status='queued' AND ca.status='approved' ORDER BY d.created_at LIMIT 5`;
  let sent = 0,
    failed = 0,
    uncertain = 0;
  const configuredLimit = Number(process.env.RADAR_MAIL_DAILY_LIMIT || 50);
  const dailyLimit = Number.isInteger(configuredLimit)
    ? Math.max(1, Math.min(500, configuredLimit))
    : 50;
  for (const entry of queue) {
    const rows =
      await sql`UPDATE radar_crm_deliveries d SET status='sending',attempted_at=now() FROM radar_crm_contacts c,radar_crm_campaigns ca,radar_prospects p WHERE d.id=${entry.id} AND d.status='queued' AND c.id=d.contact_id AND c.status='subscribed' AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email) AND ca.id=d.campaign_id AND ca.status='approved' AND p.id=c.prospect_id RETURNING d.*,c.email,c.consent_evidence,p.name AS company_name,c.prospect_id,ca.subject,ca.body,ca.variants`;
    if (!rows.length) continue;
    const d = rows[0];
    const budget =
      await sql`INSERT INTO radar_crm_send_budget(day,used) VALUES((now() AT TIME ZONE 'America/Santiago')::date,1) ON CONFLICT(day) DO UPDATE SET used=radar_crm_send_budget.used+1 WHERE radar_crm_send_budget.used<${dailyLimit} RETURNING used`;
    if (!budget.length) {
      await sql`UPDATE radar_crm_deliveries SET status='queued',attempted_at=NULL WHERE id=${d.id} AND status='sending'`;
      break;
    }
    const variant = (d.variants as CampaignVariant[]).find(
      (v) => v.id === d.variant_id,
    )!;
    const mail = composeCampaign({
      company: String(d.company_name),
      subject: String(d.subject),
      body: String(d.body),
      variant,
      ctaUrl: `${base}/r/${d.token}`,
      unsubscribeUrl: `${base}/api/radar/unsubscribe/${d.token}`,
      address: process.env.RADAR_MAIL_COMPANY_ADDRESS!,
      consent: String(d.consent_evidence),
    });
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `radar-${d.id}`,
        },
        body: JSON.stringify({
          from,
          to: [d.email],
          reply_to: process.env.RADAR_MAIL_REPLY_TO,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: {
            "List-Unsubscribe": `<${base}/api/radar/unsubscribe/${d.token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "radar_delivery_id", value: d.id },
            { name: "radar_campaign_id", value: d.campaign_id },
            { name: "radar_variant", value: d.variant_id },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (response.ok && typeof result?.id === "string") {
        await sql.transaction([
          sql`UPDATE radar_crm_deliveries SET status='sent',sent_at=now(),provider_id=${result.id},error=NULL WHERE id=${d.id}`,
          sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,metadata) VALUES(${`sent:${d.id}`},${d.id},${d.prospect_id},'send.accepted','resend',${JSON.stringify({ variantId: d.variant_id })}::jsonb) ON CONFLICT(id) DO NOTHING`,
        ]);
        sent++;
        await reconcileWebhooks();
      } else if (response.status === 429) {
        await sql`UPDATE radar_crm_deliveries SET status='queued',attempted_at=NULL,error='Límite temporal del proveedor' WHERE id=${d.id}`;
        break;
      } else if (response.status >= 500 || response.ok) {
        await sql`UPDATE radar_crm_deliveries SET status='uncertain',error='Respuesta no concluyente del proveedor: reconciliar antes de reintentar' WHERE id=${d.id}`;
        uncertain++;
        break;
      } else {
        await sql`UPDATE radar_crm_deliveries SET status='failed',error=${`Resend rechazó el envío (${response.status}). Revisar remitente, dominio o destinatario.`} WHERE id=${d.id}`;
        failed++;
      }
    } catch {
      await sql`UPDATE radar_crm_deliveries SET status='uncertain',error='No se confirmó aceptación del proveedor. Revisar Resend antes de reintentar.' WHERE id=${d.id}`;
      uncertain++;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return { sent, failed, uncertain, batchLimit: 5, dailyLimit };
}
export async function ingestWebhook(
  id: string,
  event: Record<string, unknown>,
) {
  await ensureCrmSchema();
  const sql = crmSql();
  const data = event.data as Record<string, unknown> | undefined;
  if (
    !data ||
    typeof data.email_id !== "string" ||
    typeof event.type !== "string" ||
    !/^email\.(sent|delivered|opened|clicked|bounced|complained|failed|suppressed|delivery_delayed)$/.test(
      event.type,
    )
  )
    return { ignored: true };
  const at =
    typeof event.created_at === "string" &&
    Number.isFinite(Date.parse(event.created_at))
      ? event.created_at
      : new Date().toISOString();
  const tags = data.tags as Record<string, unknown> | undefined,
    click = data.click as Record<string, unknown> | undefined;
  const hint =
    typeof tags?.radar_delivery_id === "string" ? tags.radar_delivery_id : null;
  const metadata = {
    link: typeof click?.link === "string" ? click.link.slice(0, 2048) : null,
    suspectedAutomation: automationHint(
      typeof click?.userAgent === "string" ? click.userAgent : "",
    ),
  };
  await sql`INSERT INTO radar_crm_webhooks(id,email_id,kind,occurred_at,delivery_hint,metadata) VALUES(${id},${data.email_id},${event.type},${at}::timestamptz,${hint},${JSON.stringify(metadata)}::jsonb) ON CONFLICT(id) DO NOTHING`;
  await reconcileWebhooks();
  return { accepted: true };
}
export async function reconcileWebhooks() {
  await ensureCrmSchema();
  const sql = crmSql();
  const rows =
    await sql`SELECT w.*,d.id AS delivery_id,d.token,c.prospect_id,c.email FROM radar_crm_webhooks w JOIN radar_crm_deliveries d ON d.provider_id=w.email_id OR d.id=w.delivery_hint JOIN radar_crm_contacts c ON c.id=d.contact_id WHERE w.processed=false ORDER BY w.received_at LIMIT 100`;
  for (const w of rows) {
    const meta = w.metadata as Record<string, unknown>;
    let primary = false;
    try {
      const u = new URL(String(meta.link));
      primary = u.pathname === `/r/${w.token}` && u.origin === publicBase();
    } catch {}
    const metadata = { ...meta, primary };
    const q = [
      sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,occurred_at,metadata) VALUES(${`resend:${w.id}`},${w.delivery_id},${w.prospect_id},${w.kind},'resend',${w.occurred_at}::timestamptz,${JSON.stringify(metadata)}::jsonb) ON CONFLICT(id) DO NOTHING`,
      sql`UPDATE radar_crm_webhooks SET processed=true WHERE id=${w.id}`,
    ];
    if (w.kind === "email.sent")
      q.push(
        sql`UPDATE radar_crm_deliveries SET status='sent',sent_at=COALESCE(sent_at,${w.occurred_at}::timestamptz),provider_id=COALESCE(provider_id,${w.email_id}),error=NULL WHERE id=${w.delivery_id}`,
      );
    if (
      ["email.bounced", "email.complained", "email.suppressed"].includes(
        String(w.kind),
      )
    )
      q.push(
        sql`INSERT INTO radar_crm_suppressions(email,reason) VALUES(${w.email},${w.kind}) ON CONFLICT(email) DO NOTHING`,
        sql`UPDATE radar_crm_contacts SET status='unsubscribed' WHERE email=${w.email}`,
        sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Destinatario bloqueado por proveedor' WHERE status='queued' AND contact_id IN (SELECT id FROM radar_crm_contacts WHERE email=${w.email})`,
      );
    await sql.transaction(q);
  }
}
export async function recordRedirect(
  d: Record<string, unknown>,
  request: Request,
) {
  const suspected =
    automationHint(request.headers.get("user-agent") || "") ||
    /prefetch|preview/i.test(
      request.headers.get("purpose") ||
        request.headers.get("sec-purpose") ||
        "",
    );
  const window = Math.floor(Date.now() / 60000);
  const id = createHash("sha256")
    .update(`${d.id}:${window}:${suspected}`)
    .digest("hex");
  await crmSql()`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,metadata) VALUES(${`redirect:${id}`},${d.id},${d.prospect_id},'cta.redirect','link',${JSON.stringify({ suspectedAutomation: suspected })}::jsonb) ON CONFLICT(id) DO NOTHING`;
}
