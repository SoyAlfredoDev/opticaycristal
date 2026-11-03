import { after } from "next/server";
import { drainLevelUpgradeMail,levelMailEnabled } from "@/lib/clients/level-mail";
import { customerAdminSession,canManageCustomerCategories } from "@/lib/clients/admin";
import { changeCustomerCategory,getCategorySettings,CategoryError } from "@/lib/clients/categories";
import { privateJson,readClientBody,sameClientOrigin } from "@/lib/clients/http";
export const runtime="nodejs";
export const maxDuration=60;
type Context={params:Promise<{id:string}>};
function failure(error:unknown){return privateJson({error:error instanceof CategoryError?error.message:"No pudimos completar el cambio. Reintenta con los mismos datos."},error instanceof CategoryError?error.status:503);}
export async function GET(_request:Request,context:Context){
 const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);
 try{return privateJson({settings:await getCategorySettings((await context.params).id),canEdit:canManageCustomerCategories(staff.u)});}catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
 const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);
 if(!canManageCustomerCategories(staff.u))return privateJson({error:"Solo el responsable autorizado puede cambiar niveles."},403);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:unknown;try{body=await readClientBody(request);}catch{return privateJson({error:"Datos no válidos."},400);}
 try{const id=(await context.params).id;const result=await changeCustomerCategory(id,body,staff.u);if(levelMailEnabled()&&(result.changed||result.replayed))after(async()=>{try{await drainLevelUpgradeMail({customerId:id});}catch{console.error("No se pudo procesar el correo de ascenso. El aviso sigue en cola.");}});return privateJson(result);}catch(error){return failure(error);}
}
