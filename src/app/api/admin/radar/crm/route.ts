import {
  hasRadarAccess,
  readRadarBody,
  apiFailure,
  RadarApiError,
} from "@/lib/radar/api";
import { getSession } from "@/lib/auth";
import { crmAction, crmSnapshot } from "@/lib/radar/crm-store";
import { dispatchCampaign, reconcileWebhooks } from "@/lib/radar/crm-mail";
import { requiredText } from "@/lib/radar/crm-validation";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await hasRadarAccess(request, "read")))
    return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    return Response.json(
      await crmSnapshot(new URL(request.url).searchParams.get("prospectId")),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      origin &&
      origin !==
        new URL(
          `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`,
        ).origin &&
      origin !== process.env.RADAR_PUBLIC_URL?.replace(/\/$/, "")
    )
      throw new RadarApiError("Origen no autorizado.", 403);
    const body = await readRadarBody(request, 24000);
    const action = requiredText(body, "action");
    const scope =
      action === "dispatch"
        ? "send"
        : action.startsWith("campaign") ||
            action === "enroll" ||
            action === "insight"
          ? "marketing"
          : "manage";
    if (!(await hasRadarAccess(request, scope)))
      return Response.json({ error: "No autorizado." }, { status: 401 });
    const human = !!(await getSession());
    if (action === "campaignStatus" && body.status === "approved" && !human)
      throw new RadarApiError(
        "La aprobación de una campaña requiere sesión administrativa.",
        403,
      );
    if (action === "dispatch")
      return Response.json(
        await dispatchCampaign(requiredText(body, "campaignId", 100)),
      );
    if (action === "reconcile") {
      await reconcileWebhooks();
      return Response.json({ ok: true });
    }
    return Response.json(await crmAction(body, human ? "admin" : "agent"));
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
