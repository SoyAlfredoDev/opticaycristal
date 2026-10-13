import {
  assertRadarOrigin,
  hasRadarAccess,
  readRadarBody,
  apiFailure,
  RadarApiError,
} from "@/lib/radar/api";
import { getSession } from "@/lib/auth";
import { workspaceSnapshot, workspaceAction } from "@/lib/radar/crm-workspace";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read")))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const u = new URL(request.url),
      page = Number(u.searchParams.get("page") || 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000)
      throw new RadarApiError("Página inválida.");
    return Response.json(
      await workspaceSnapshot(
        (u.searchParams.get("q") || "").slice(0, 200),
        u.searchParams.get("relation") || "",
        page,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
export async function POST(request: Request) {
  try {
    assertRadarOrigin(request);
    const body = await readRadarBody(request, 12000),
      scope =
        body.action === "enrollSegment" ||
        body.action === "campaignSchedule" ||
        body.action === "seedMonthly" ||
        body.action === "sendingSetting"
          ? "marketing"
          : "manage";
    if (!(await hasRadarAccess(request, scope)))
      return Response.json({ error: "No autorizado." }, { status: 401 });
    const human = !!(await getSession());
    if (body.action === "sendingSetting" && !human)
      throw new RadarApiError(
        "La activación de envíos requiere sesión administrativa.",
        403,
      );
    return Response.json(
      await workspaceAction(body, human ? "admin" : "agent"),
    );
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
