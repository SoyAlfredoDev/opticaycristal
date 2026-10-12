import { deliveryByToken, publicBase } from "@/lib/radar/crm-store";
import { recordRedirect } from "@/lib/radar/crm-mail";
import type { CampaignVariant } from "@/lib/radar/crm-model";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const d = await deliveryByToken(token);
    if (!d) return new Response("Enlace no disponible.", { status: 404 });
    const variant = (d.variants as CampaignVariant[]).find(
      (v) => v.id === d.variant_id,
    );
    if (!variant) return new Response(null, { status: 404 });
    await recordRedirect(d, request);
    const destination =
      variant.kind === "web"
        ? `${publicBase()}/beneficios-empresas/${token}`
        : variant.destination;
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("El enlace no está disponible temporalmente.", {
      status: 503,
    });
  }
}
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
