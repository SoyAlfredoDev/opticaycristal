import { hasRadarAccess, apiFailure } from "@/lib/radar/api";
import { contactWorkbook } from "@/lib/radar/crm-excel";
import { ensureCrmSchema, crmSql } from "@/lib/radar/crm-schema";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read")))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const template =
      new URL(request.url).searchParams.get("template") === "true";
    let rows: unknown[][] = [];
    if (!template) {
      await ensureCrmSchema();
      const data =
        await crmSql()`SELECT p.name,c.email,c.name AS contact_name,c.role,p.phone,p.website,p.address,p.relationship_status,c.marketing_ready,c.status,s.reason,p.source FROM radar_crm_contacts c JOIN radar_prospects p ON p.id=c.prospect_id LEFT JOIN radar_crm_suppressions s ON s.email=c.email ORDER BY c.email,p.name`;
      rows = data.map((c) => [
        c.name,
        c.email,
        c.contact_name,
        c.role,
        c.phone,
        c.website,
        c.address,
        c.relationship_status,
        c.reason || c.status === "unsubscribed"
          ? "Excluido"
          : c.marketing_ready
            ? "Habilitado"
            : "Pendiente de llamada",
        c.source,
      ]);
    }
    return new Response(await contactWorkbook(rows, template), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${template ? "plantilla-contactos" : "contactos-optica-cristal"}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
