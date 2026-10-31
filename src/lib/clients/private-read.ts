import "server-only";
import { createHash } from "node:crypto";
import { customerSession } from "./auth";
import { privateJson } from "./http";

/** Timings contain no identifiers, query text, credentials or customer values. */
export async function privateCustomerRead(request: Request, read: (id: string) => Promise<unknown>) {
  const start = performance.now();
  try {
    const session = await customerSession();
    const authenticated = performance.now();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    const body = await read(session.user.id);
    if (body === null) return privateJson({ error: "Información no encontrada." }, 404);
    const loaded = performance.now();
    const etag = `"${createHash("sha256").update(session.user.id).update(JSON.stringify(body)).digest("hex")}"`;
    const response = request.headers.get("if-none-match") === etag
      ? new Response(null, { status: 304, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } })
      : privateJson(body);
    response.headers.set("X-Customer-Scope", session.user.id);
    response.headers.set("ETag", etag); response.headers.set("Vary", "Cookie");
    response.headers.set("Server-Timing", `session;dur=${(authenticated-start).toFixed(1)}, data;dur=${(loaded-authenticated).toFixed(1)}, total;dur=${(performance.now()-start).toFixed(1)}`);
    return response;
  } catch (error) {
    return privateJson({ error: error instanceof InvalidHistoryCursor ? "Página no válida." : "No pudimos cargar la información." }, error instanceof InvalidHistoryCursor ? 400 : 503);
  }
}
export class InvalidHistoryCursor extends Error {}
