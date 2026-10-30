import { customerAdminSession,canManageCustomerCategories } from "@/lib/clients/admin";
import { changeCustomerCategory,getCategorySettings,CategoryError } from "@/lib/clients/categories";
import { privateJson,readClientBody,sameClientOrigin } from "@/lib/clients/http";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
function failure(error:unknown){return privateJson({error:error instanceof CategoryError?error.message:"No pudimos completar el cambio. Reintenta con los mismos datos."},error instanceof CategoryError?error.status:503);}
export async function GET(_request:Request,context:Context){
 const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);
 try{return privateJson({settings:await getCategorySettings((await context.params).id),canEdit:canManageCustomerCategories(staff.u)});}catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
 const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);
 if(!canManageCustomerCategories(staff.u))return privateJson({error:"Solo el responsable autorizado puede cambiar categorías."},403);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:unknown;try{body=await readClientBody(request);}catch{return privateJson({error:"Datos no válidos."},400);}
 try{return privateJson(await changeCustomerCategory((await context.params).id,body,staff.u));}catch(error){return failure(error);}
}
