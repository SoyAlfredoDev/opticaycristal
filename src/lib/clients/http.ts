import "server-only";
import { NextResponse } from "next/server";
import { clientFingerprint } from "./privacy";
import { clientPool, clientTable } from "./db";
export function privateJson(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } }); }
export function sameClientOrigin(request: Request) {
  const expected = new URL(process.env.CLIENT_APP_URL || "https://opticaycristal.cl").origin;
  return request.headers.get("origin") === expected;
}
export async function readClientBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Formato de solicitud no válido.");
  if (Number(request.headers.get("content-length") || 0) > 8192) throw new Error("La solicitud es demasiado grande.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Solicitud vacía.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8192) { await reader.cancel(); throw new Error("La solicitud es demasiado grande."); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; } catch { throw new Error("No se pudo leer la solicitud."); }
}
export async function allowClientRegistration(request: Request, email: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || "unknown";
  for (const [value, purpose, max] of [[ip, "register-ip", 8], [email, "register-email", 3]] as const) {
    const key = clientFingerprint(value, purpose);
    const result = await clientPool().query(`INSERT INTO ${clientTable("oc_client_registration_limit")} AS limits (key, count, reset_at) VALUES ($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.reset_at < now() THEN 1 ELSE limits.count+1 END, reset_at=CASE WHEN limits.reset_at < now() THEN now()+interval '1 hour' ELSE limits.reset_at END RETURNING count`, [key]);
    if (Number(result.rows[0].count) > max) return false;
  }
  return true;
}
