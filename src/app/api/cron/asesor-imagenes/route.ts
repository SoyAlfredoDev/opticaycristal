import { createHash, timingSafeEqual } from "node:crypto";
import { privateJson } from "@/lib/clients/http";
import { purgeExpiredFrameImages } from "@/lib/frame-advisor/image-store";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!secret || !token || !timingSafeEqual(createHash("sha256").update(secret).digest(),createHash("sha256").update(token).digest())) return privateJson({ error: "Acceso restringido." },401);
  try {
    // Missing migration must fail visibly; never expose counts or customer identifiers.
    await purgeExpiredFrameImages();
    return privateJson({ ok: true });
  } catch { return privateJson({ error: "No se pudo completar la limpieza." },503); }
}
