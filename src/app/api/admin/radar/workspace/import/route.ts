import {
  assertRadarOrigin,
  hasRadarAccess,
  readRadarBody,
  apiFailure,
  RadarApiError,
} from "@/lib/radar/api";
import { parseContactFile } from "@/lib/radar/crm-excel";
import { ensureCrmSchema, crmSql } from "@/lib/radar/crm-schema";
import { saveProspectWithStatus } from "@/lib/radar/db";
import { crmAction } from "@/lib/radar/crm-store";
import { getSession } from "@/lib/auth";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    if (!(await hasRadarAccess(request, "manage")))
      return Response.json({ error: "No autorizado." }, { status: 401 });
    assertRadarOrigin(request);
    const body = await readRadarBody(request, 1600000);
    let parsed: Awaited<ReturnType<typeof parseContactFile>>;
    try {
      parsed = await parseContactFile(body);
    } catch (e) {
      throw new RadarApiError(
        e instanceof Error ? e.message : "Archivo inválido.",
      );
    }
    await ensureCrmSchema();
    const sql = crmSql();
    const existing =
      await sql`SELECT DISTINCT email FROM radar_crm_contacts WHERE email=ANY(${parsed.valid.map((r) => r.email)}::text[])`;
    const seen = new Set(existing.map((c) => String(c.email))),
      fresh = parsed.valid.filter((r) => !seen.has(r.email)),
      duplicates =
        parsed.duplicates.length + parsed.valid.length - fresh.length;
    if (body.commit !== true)
      return Response.json({
        valid: fresh.length,
        duplicates,
        errors: parsed.errors,
        rows: fresh
          .slice(0, 20)
          .map((r) => ({
            row: r.row,
            company: r.company.name,
            email: r.email,
          })),
        preview: true,
      });
    const actor = (await getSession()) ? "admin" : "agent";
    let imported = 0;
    const errors = [...parsed.errors];
    for (let offset = 0; offset < fresh.length; offset += 8)
      await Promise.all(
        fresh.slice(offset, offset + 8).map(async (row) => {
          try {
            const saved = await saveProspectWithStatus(row.company);
            await crmAction(
              {
                action: "contact",
                prospectId: saved.prospect.id,
                email: row.email,
                name: row.name,
                role: row.role,
              },
              actor,
            );
            imported++;
          } catch (e) {
            errors.push({
              row: row.row,
              error: e instanceof Error ? e.message : "No se pudo guardar.",
            });
          }
        }),
      );
    return Response.json({ imported, duplicates, errors });
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
