import { createHash } from "node:crypto";
import { customerSession } from "@/lib/clients/auth";
import { getCustomerProfile, getCustomerTiers } from "@/lib/clients/store";
import { privateJson } from "@/lib/clients/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    const [customer, tiers] = await Promise.all([getCustomerProfile(session.user.id), getCustomerTiers()]);
    if (!customer) return privateJson({ error: "Cuenta no encontrada." }, 404);
    const body = { customer, tiers };
    const etag = `"${createHash("sha256").update(JSON.stringify(body)).digest("hex")}"`;
    // Auth runs before the comparison. Data remains private/no-store, even for 304.
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "no-store, private", Vary: "Cookie", "Referrer-Policy": "no-referrer" } });
    }
    const response = privateJson(body);
    response.headers.set("ETag", etag); response.headers.set("Vary", "Cookie");
    return response;
  } catch { return privateJson({ error: "No pudimos cargar tu cuenta." }, 503); }
}
