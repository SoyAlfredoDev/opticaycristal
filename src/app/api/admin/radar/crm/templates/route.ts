import { hasRadarAccess, apiFailure } from "@/lib/radar/api";
import { campaignTemplates, campaignTemplate } from "@/lib/radar/campaign-templates";
import { renderCampaignEmail } from "@/lib/radar/campaign-render";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read"))) return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ templates: campaignTemplates }, { headers: { "Cache-Control": "no-store" } });
    if (!campaignTemplates.some(t => t.id === id)) return Response.json({ error: "Formato no encontrado." }, { status: 404 });
    const t = campaignTemplate(id);
    return Response.json(renderCampaignEmail({ company: "[Tu empresa]", subject: t.subject, body: t.body, templateId: t.id,
      variant: { id: "v1", kind: "web", label: t.cta, destination: "" }, ctaUrl: "#vista-previa", unsubscribeUrl: "#baja-vista-previa",
      address: process.env.RADAR_MAIL_COMPANY_ADDRESS || "Huérfanos 713, local 18, Santiago Centro", consent: "" }),
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) { const f = apiFailure(e); return Response.json(f.body, { status: f.status }); }
}
