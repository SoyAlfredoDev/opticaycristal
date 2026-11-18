import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson } from "@/lib/clients/http";
import { SaleControlError } from "@/lib/clients/sale-control";
import { listAdminSales } from "@/lib/clients/sales-register";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const staff = await customerAdminSession(true);
  if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
  const params = new URL(request.url).searchParams;
  const rawOffset = params.get("offset") ?? "0";
  if (!/^\d{1,5}$/.test(rawOffset)) return privateJson({ error: "Página no válida." }, 400);
  try {
    return privateJson(await listAdminSales(params.get("q") ?? "", Number(rawOffset), staff.role === "seller" ? staff.u : null));
  } catch (error) {
    if (error instanceof SaleControlError) return privateJson({ error: error.message }, error.status);
    return privateJson({ error: "No pudimos cargar las ventas. Inténtalo nuevamente." }, 503);
  }
}
