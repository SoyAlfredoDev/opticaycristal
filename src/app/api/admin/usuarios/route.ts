import {getSession} from "@/lib/auth";
import {privateJson,readClientBody,sameClientOrigin} from "@/lib/clients/http";
import {StaffError,listStaffUsers,inviteStaffUser,cancelStaffInvitation,changeStaffStatus} from "@/lib/staff/users";
export const runtime="nodejs";
export async function GET(){if(!await getSession())return privateJson({error:"Inicia sesión."},401);try{return privateJson(await listStaffUsers());}catch{return privateJson({error:"La administración de usuarios no está disponible."},503);}}
export async function POST(request:Request){
 const session=await getSession();if(!session)return privateJson({error:"Inicia sesión."},401);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:Record<string,unknown>;try{const raw=await readClientBody(request);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error();body=raw as Record<string,unknown>;}catch{return privateJson({error:"Solicitud no válida."},400);}
 try{switch(body.action){case "invite":return privateJson({invite:await inviteStaffUser(body,session)});case "cancel":await cancelStaffInvitation(body.id,session);break;case "status":await changeStaffStatus(body.id,body.status,session);break;default:return privateJson({error:"Acción no válida."},400);}return privateJson({ok:true});}catch(e){return privateJson({error:e instanceof StaffError?e.message:"No se pudo completar la operación."},e instanceof StaffError?e.status:503);}
}
