import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson,sameClientOrigin } from "@/lib/clients/http";
export const runtime="nodejs";
/** Retained for stale tabs: sale references are now generated once, never edited. */
export async function POST(request:Request) {
 if(!await customerAdminSession(true))return privateJson({error:"Acceso restringido."},401);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 return privateJson({error:"El control interno se genera automáticamente y no puede modificarse."},403);
}
