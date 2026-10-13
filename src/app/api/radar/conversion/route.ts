import { deliveryByToken } from "@/lib/radar/crm-store";
import { crmSql } from "@/lib/radar/crm-schema";
import { escapeEmail } from "@/lib/radar/crm-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000)
      return new Response(null, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const p = await reader.read();
        if (p.done) break;
        size += p.value.length;
        if (size > 12000) {
          await reader.cancel();
          return new Response(null, { status: 413 });
        }
        chunks.push(p.value);
      }
    } finally {
      reader.releaseLock();
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    if (form.get("website") || form.get("authorization") !== "on")
      return new Response("Solicitud inválida.", { status: 400 });
    const name = form.get("name")?.trim() || "",
      role = form.get("role")?.trim() || "",
      message = form.get("message")?.trim() || "";
    if (
      !name ||
      name.length > 120 ||
      !message ||
      message.length > 2000 ||
      role.length > 120
    )
      return new Response("Revisa los campos.", { status: 400 });
    const d = await deliveryByToken(form.get("token") || "");
    if (!d) return new Response("Enlace no disponible.", { status: 404 });
    const sql = crmSql();
    await sql.transaction([
      sql`INSERT INTO radar_crm_followups(id,prospect_id,contact_id,delivery_id,source,subject,message,status) VALUES(${`web:${d.id}`},${d.prospect_id},${d.contact_id},${d.id},'web-form','Solicitud de información',${message},'interested') ON CONFLICT DO NOTHING`,
      sql`INSERT INTO radar_crm_events(id,delivery_id,prospect_id,kind,source,metadata) VALUES(${`conversation:${d.id}`},${d.id},${d.prospect_id},'conversation','web-form',${JSON.stringify({ name, role, message, confirmed: true, contactAuthorization: true })}::jsonb) ON CONFLICT(id) DO NOTHING`,
      sql`INSERT INTO radar_crm_tasks(id,prospect_id,title,owner,due_at) VALUES(${`conversion-task:${d.id}`},${d.prospect_id},'Responder solicitud de convenio o jornada','Equipo comercial',now()+interval '1 day') ON CONFLICT(id) DO NOTHING`,
    ]);
    return new Response(
      `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solicitud registrada</title><body style="font-family:Arial;padding:40px;max-width:680px;margin:auto"><h1>Gracias, ${escapeEmail(name)}</h1><p>Registramos tu solicitud. Nuestro equipo comercial te contactará para conversar sobre una propuesta.</p><a href="/">Volver a Óptica &amp; Cristal</a></body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return new Response(
      "No pudimos guardar la solicitud. Intenta nuevamente.",
      { status: 503 },
    );
  }
}
