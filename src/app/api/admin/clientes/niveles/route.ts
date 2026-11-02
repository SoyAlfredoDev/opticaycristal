import { customerAdminSession, canManageCustomerCategories } from "@/lib/clients/admin";
import { LevelError, getLevelSettings, updateLevelBenefits } from "@/lib/clients/levels";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
export const runtime = "nodejs";
function failure(error: unknown) {
  return privateJson({ error: error instanceof LevelError ? error.message : "No pudimos completar la operación. Reintenta con los mismos datos." }, error instanceof LevelError ? error.status : 503);
}
export async function GET(request: Request) {
  const staff = await customerAdminSession();
  if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
  const url = new URL(request.url);
  try { return privateJson({ settings: await getLevelSettings(url.searchParams.get("level"), url.searchParams.get("cursor")), canEdit: canManageCustomerCategories(staff.u) }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const staff = await customerAdminSession();
  if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
  if (!canManageCustomerCategories(staff.u)) return privateJson({ error: "Solo el responsable autorizado puede configurar niveles." }, 403);
  if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);
  let body: unknown;
  try { body = await readClientBody(request); } catch { return privateJson({ error: "Datos no válidos." }, 400); }
  try { return privateJson(await updateLevelBenefits(body, staff.u)); }
  catch (error) { return failure(error); }
}
