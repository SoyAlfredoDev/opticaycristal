import {clientIp} from "@/lib/auth";
import {privateJson,readClientBody,sameClientOrigin} from "@/lib/clients/http";
import {StaffError,allowStaffRequest,lookupStaffInvitation,acceptStaffInvitation} from "@/lib/staff/users";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;if(!["consultar","aceptar"].includes(action))return privateJson({error:"Acción no disponible."},404);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:Record<string,unknown>;try{const raw=await readClientBody(request);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error();body=raw as Record<string,unknown>;}catch{return privateJson({error:"Solicitud no válida."},400);}
 try{if(!await allowStaffRequest(clientIp(request),action==="consultar"?"lookup":"register"))return privateJson({error:"Demasiados intentos. Espera unos minutos."},429);return privateJson(action==="consultar"?await lookupStaffInvitation(body.token):await acceptStaffInvitation(body));}catch(e){return privateJson({error:e instanceof StaffError?e.message:"El acceso no está disponible temporalmente."},e instanceof StaffError?e.status:503);}
}
