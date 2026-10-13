import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/auth";
import {
  radarIndustries,
  radarRegions,
  type RadarSearchFilters,
  type RadarIndustry,
} from "./catalog";

export class RadarApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assertRadarOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`,
  ).origin;
  if (
    origin &&
    origin !== expected &&
    origin !== process.env.RADAR_PUBLIC_URL?.replace(/\/$/, "")
  )
    throw new RadarApiError("Origen no autorizado.", 403);
}
export type RadarScope =
  | "read"
  | "search"
  | "save"
  | "enrich"
  | "analyze"
  | "manage"
  | "marketing"
  | "send";
/** Optional machine credentials; no tokens are exposed to the browser. Default machine permission: read. */
export async function hasRadarAccess(
  request: Request | undefined,
  scope: RadarScope,
): Promise<boolean> {
  if (await getSession()) return true;
  const configured = process.env.RADAR_AGENT_API_KEY?.trim();
  if (!request || !configured || configured.length < 32) return false;
  const value = request.headers
    .get("authorization")
    ?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!value || value.length > 512) return false;
  const equal = timingSafeEqual(
    createHash("sha256").update(configured).digest(),
    createHash("sha256").update(value).digest(),
  );
  const scopes = (process.env.RADAR_AGENT_SCOPES || "read")
    .split(",")
    .map((value) => value.trim());
  return equal && scopes.includes(scope);
}
export async function readRadarBody(
  request: Request,
  maxBytes = 4096,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new RadarApiError("Solicitud vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RadarApiError(
          "La solicitud supera el tamaño permitido.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new RadarApiError(
      "La solicitud debe contener un objeto JSON válido.",
    );
  }
}
export function validateSearchFilters(
  body: Record<string, unknown>,
): RadarSearchFilters {
  if (
    typeof body.region !== "string" ||
    !radarRegions.includes(body.region as (typeof radarRegions)[number])
  )
    throw new RadarApiError("Selecciona una región válida.");
  if (
    typeof body.industry !== "string" ||
    !radarIndustries.includes(body.industry as RadarIndustry)
  )
    throw new RadarApiError("Selecciona un rubro válido.");
  if (
    body.industry === "other" &&
    (typeof body.otherIndustry !== "string" ||
      !body.otherIndustry.trim() ||
      body.otherIndustry.trim().length > 80)
  )
    throw new RadarApiError("Especifica un rubro de hasta 80 caracteres.");
  if (
    body.commune !== undefined &&
    (typeof body.commune !== "string" ||
      body.commune.length > 80 ||
      /[\n\r<>]/.test(body.commune))
  )
    throw new RadarApiError("La comuna debe tener hasta 80 caracteres.");
  return {
    region: body.region,
    industry: body.industry as RadarIndustry,
    otherIndustry:
      typeof body.otherIndustry === "string" ? body.otherIndustry.trim() : "",
    ...(typeof body.commune === "string" && body.commune.trim()
      ? { commune: body.commune.trim() }
      : {}),
  };
}
export function apiFailure(error: unknown) {
  return {
    body: {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación.",
    },
    status: error instanceof RadarApiError ? error.status : 503,
  };
}
