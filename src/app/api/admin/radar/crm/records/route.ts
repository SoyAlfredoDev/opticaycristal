import { hasRadarAccess, apiFailure, RadarApiError } from "@/lib/radar/api";
import { ensureCrmSchema, crmSql } from "@/lib/radar/crm-schema";
export const runtime = "nodejs";
const tables: Record<string, string> = {
  contacts: "radar_crm_contacts",
  tasks: "radar_crm_tasks",
  deals: "radar_crm_deals",
  campaigns: "radar_crm_campaigns",
  events: "radar_crm_events",
  deliveries: "radar_crm_deliveries",
};
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read")))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const p = new URL(request.url).searchParams,
      entity = p.get("entity") || "events",
      table = tables[entity],
      cursor = p.get("cursor") || "",
      limit = Number(p.get("limit") || 100);
    if (
      !table ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 200 ||
      cursor.length > 150
    )
      throw new RadarApiError("Entidad, cursor o límite inválido.");
    await ensureCrmSchema();
    const columns =
      entity === "deliveries"
        ? "id,campaign_id,contact_id,variant_id,status,provider_id,error,attempted_at,created_at,sent_at"
        : "*";
    const rows = await crmSql().query(
      `SELECT ${columns} FROM ${table} WHERE id > $1 ORDER BY id LIMIT $2`,
      [cursor, limit + 1],
    );
    return Response.json(
      {
        entity,
        records: rows.slice(0, limit),
        nextCursor: rows.length > limit ? rows[limit - 1].id : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
