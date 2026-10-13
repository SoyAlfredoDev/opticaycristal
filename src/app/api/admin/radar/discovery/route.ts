import {
  hasRadarAccess,
  readRadarBody,
  RadarApiError,
  apiFailure,
} from "@/lib/radar/api";
import { allowAttempt, clientIp } from "@/lib/auth";
import { verifyResult, signResult } from "@/lib/radar/integrity";
import { discoverEmail } from "@/lib/radar/discovery";
import type { CompanyResult } from "@/lib/radar/types";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (!(await hasRadarAccess(request, "enrich")))
      return Response.json({ error: "No autorizado." }, { status: 401 });
    if (!allowAttempt(`radar-discovery:${clientIp(request)}`, 20, 60000))
      throw new RadarApiError(
        "Espera un minuto antes de continuar la consulta de webs.",
        429,
      );
    const b = await readRadarBody(request, 100000),
      c = b.company as CompanyResult;
    if (!c || typeof b.proof !== "string" || !verifyResult(c, b.proof))
      throw new RadarApiError("Resultado de búsqueda no verificado.");
    const company = await discoverEmail(c);
    return Response.json({ company, proof: signResult(company) });
  } catch (e) {
    const f = apiFailure(e);
    return Response.json(f.body, { status: f.status });
  }
}
