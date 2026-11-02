import { customerAdminSession,canManageProductCosts } from "@/lib/clients/admin";
import { privateJson,readClientBody,sameClientOrigin } from "@/lib/clients/http";
import { CommitmentError,contractSettingsSummary,saveContractSettings,prepareCommitment } from "@/lib/clients/commitments";
export const runtime="nodejs";
export async function GET(){const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);if(!canManageProductCosts(staff.u))return privateJson({error:"Solo el responsable puede consultar esta configuración."},403);try{return privateJson({settings:await contractSettingsSummary()});}catch{return privateJson({error:"No pudimos consultar la configuración de compromisos."},503);}}
export async function POST(request:Request){
 const staff=await customerAdminSession();if(!staff)return privateJson({error:"Acceso restringido."},401);
 if(!sameClientOrigin(request))return privateJson({error:"Origen no permitido."},403);
 let body:Record<string,unknown>;
 try{const raw=await readClientBody(request,125_000);if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error();body=raw as Record<string,unknown>;}catch{return privateJson({error:"Revisa los datos y selecciona una firma PNG de hasta 80 KB."},400);}
 try{
  if(body.action==="settings"){
   if(!canManageProductCosts(staff.u))return privateJson({error:"Solo el responsable puede configurar la firma."},403);
   await saveContractSettings(body,staff.u);
  }else if(body.action==="prepare"){await prepareCommitment(body.saleId,staff.u);}
  else return privateJson({error:"Acción no válida."},400);
  return privateJson({ok:true});
 }catch(error){return privateJson({error:error instanceof CommitmentError?error.message:"No pudimos preparar el compromiso. Revisa la conexión e inténtalo nuevamente."},error instanceof CommitmentError?400:503);}
}
