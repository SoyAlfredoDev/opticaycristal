import { deliveryByToken, unsubscribeDelivery } from "@/lib/radar/crm-store";
export const runtime = "nodejs";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!(await deliveryByToken(token)))
      return new Response("Enlace no disponible.", { status: 404 });
    return new Response(
      `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja de comunicaciones</title><body style="font-family:Arial;padding:40px;max-width:600px;margin:auto"><h1>Comunicaciones de Óptica &amp; Cristal</h1><p>Puedes dejar de recibir nuestros mensajes comerciales. Tu baja se aplicará inmediatamente.</p><form method="post"><button style="padding:14px;background:#152c40;color:white;border:0">Confirmar baja</button></form></body></html>`,
      { headers },
    );
  } catch {
    return new Response("Servicio temporalmente no disponible.", {
      status: 503,
    });
  }
}
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    await unsubscribeDelivery((await params).token);
    return new Response(
      "<!doctype html><html lang='es'><title>Baja confirmada</title><body style='font-family:Arial;padding:40px'><h1>Baja confirmada</h1><p>No recibirás más campañas comerciales de Óptica &amp; Cristal.</p></body></html>",
      { headers },
    );
  } catch {
    return new Response("Enlace no disponible.", { status: 404 });
  }
}
