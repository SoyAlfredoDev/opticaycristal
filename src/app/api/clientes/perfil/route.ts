import { customerSession } from "@/lib/clients/auth";
import { getCustomerProfile } from "@/lib/clients/store";
import { privateJson } from "@/lib/clients/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const session = await customerSession();
    if (!session) return privateJson({ error: "Inicia sesión." }, 401);
    const customer = await getCustomerProfile(session.user.id);
    return customer ? privateJson({ customer }) : privateJson({ error: "Cuenta no encontrada." }, 404);
  } catch { return privateJson({ error: "No pudimos cargar tu cuenta." }, 503); }
}
