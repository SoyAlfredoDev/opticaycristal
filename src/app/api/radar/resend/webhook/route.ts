import { Webhook } from "svix";
import { ingestWebhook } from "@/lib/radar/crm-mail";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret)
    return Response.json({ error: "Webhook no configurado." }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 256000) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  let event: Record<string, unknown>;
  const id = request.headers.get("svix-id") || "";
  try {
    const raw = Buffer.concat(chunks).toString("utf8");
    new Webhook(secret).verify(raw, {
      "svix-id": id,
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    });
    event = JSON.parse(raw) as Record<string, unknown>;
    if (!event || typeof event !== "object" || Array.isArray(event))
      throw new Error();
  } catch {
    return Response.json({ error: "Firma inválida." }, { status: 400 });
  }
  try {
    return Response.json(await ingestWebhook(id, event));
  } catch {
    return Response.json(
      { error: "No se pudo persistir; reintentar." },
      { status: 503 },
    );
  }
}
