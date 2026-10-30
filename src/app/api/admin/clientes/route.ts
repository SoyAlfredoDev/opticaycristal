import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson } from "@/lib/clients/http";
import { listCustomerSummaries } from "@/lib/clients/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await customerAdminSession()) return privateJson({ error: "Acceso restringido." }, 401);
  try { return privateJson({ customers: await listCustomerSummaries(new URL(request.url).searchParams.get("q") || "") }); }
  catch { return privateJson({ error: "No se pudo consultar a los clientes." }, 503); }
}
