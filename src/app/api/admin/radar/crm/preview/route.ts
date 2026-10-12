import { hasRadarAccess, apiFailure } from "@/lib/radar/api";
import { ensureCrmSchema, crmSql } from "@/lib/radar/crm-schema";
import { composeCampaign } from "@/lib/radar/crm-mail";
import type { CampaignVariant } from "@/lib/radar/crm-model";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read")))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    await ensureCrmSchema();
    const rows =
      await crmSql()`SELECT * FROM radar_crm_campaigns WHERE id=${new URL(request.url).searchParams.get("campaignId")}`;
    if (!rows.length)
      return Response.json(
        { error: "Campaña no encontrada." },
        { status: 404 },
      );
    const c = rows[0];
    return Response.json(
      composeCampaign({
        company: "[Nombre de la empresa destinataria]",
        subject: String(c.subject),
        body: String(c.body),
        variant: (c.variants as CampaignVariant[])[0],
        ctaUrl: "#vista-previa",
        unsubscribeUrl: "#baja-vista-previa",
        address:
          process.env.RADAR_MAIL_COMPANY_ADDRESS ||
          "[Dirección comercial pendiente de configurar]",
        consent: "",
        templateId: String(c.template_id || "convenio"),
      }),
    );
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
