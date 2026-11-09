import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson,sameClientOrigin,readClientBody} from '@/lib/clients/http';
import {createStaffCustomer,limitStaffCustomerAction,AdminCreateError} from '@/lib/clients/admin-create';
import {whatsappRequestIp} from '@/lib/integrations/whatsapp-verification-limits';
export const runtime='nodejs';
export async function POST(request:Request){
 const staff=await customerAdminSession(true);
 if(!staff)return privateJson({error:'Acceso restringido.'},401);
 if(!sameClientOrigin(request))return privateJson({error:'Origen no permitido.'},403);
 let raw;try{raw=await readClientBody(request,4096);}catch{return privateJson({error:'Datos no válidos.'},400);}
 try{
  await limitStaffCustomerAction(staff.u,'create-actor',50);
  await limitStaffCustomerAction(whatsappRequestIp(request),'create-ip',100);
  await limitStaffCustomerAction('all','create-global',200);
  return privateJson(await createStaffCustomer(raw,staff.u));
 }catch(e){return privateJson({error:e instanceof AdminCreateError?e.message:'No pudimos guardar el cliente.'},e instanceof AdminCreateError?e.status:503);}
}
