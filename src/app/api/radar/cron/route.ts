import { createHash, timingSafeEqual } from "node:crypto";
import { crmSql, ensureCrmSchema } from "@/lib/radar/crm-schema";
import { dispatchCampaign, reconcileWebhooks } from "@/lib/radar/crm-mail";
import { marketingEnabled } from "@/lib/radar/crm-settings";
import { reconcileInbound } from "@/lib/radar/crm-inbound";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET,
    token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (
    !secret ||
    !token ||
    !timingSafeEqual(
      createHash("sha256").update(secret).digest(),
      createHash("sha256").update(token).digest(),
    )
  )
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    await ensureCrmSchema();
    await reconcileWebhooks();
    await reconcileInbound();
    const sql = crmSql();
    await sql`UPDATE radar_crm_deliveries SET status='cancelled',error='Campaña del mes finalizada' WHERE status='queued' AND campaign_id IN(SELECT id FROM radar_crm_campaigns WHERE expires_at<=now())`;
    const campaigns =
      await sql`SELECT id FROM radar_crm_campaigns WHERE status='approved' AND scheduled_at<=now() AND (expires_at IS NULL OR expires_at>now()) ORDER BY scheduled_at LIMIT 10`;
    let sent = 0;
    const enabled = await marketingEnabled();
    if (enabled) {
      for (const c of campaigns) {
        const r = await dispatchCampaign(String(c.id));
        sent += r.sent;
        if (sent >= 50) break;
      }
    }
    return Response.json({
      sent,
      scheduledCampaigns: campaigns.length,
      sendingEnabled: enabled,
    });
  } catch {
    return Response.json(
      { error: "No se pudo procesar la cola." },
      { status: 503 },
    );
  }
}
