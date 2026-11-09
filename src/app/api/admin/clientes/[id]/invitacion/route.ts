import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson,sameClientOrigin,readClientBody} from '@/lib/clients/http';
import {inviteCreatedCustomer,AdminCreateError,limitStaffCustomerAction} from '@/lib/clients/admin-create';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const staff=await customerAdminSession(true);if(!staff)return privateJson({error:'Acceso restringido.'},401);
 if(!sameClientOrigin(request))return privateJson({error:'Origen no permitido.'},403);
 let raw;try{raw=await readClientBody(request,128);}catch{return privateJson({error:'Solicitud no válida.'},400);}
 const{id}=await params;
 if(!id||id.length>120||!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length)return privateJson({error:'Solicitud no válida.'},400);
 try{await limitStaffCustomerAction(staff.u,'invite-actor',50);await inviteCreatedCustomer(id);return privateJson({sent:true});}
 catch(e){return privateJson({error:e instanceof AdminCreateError?e.message:'No pudimos enviar el enlace. El cliente sigue guardado.'},e instanceof AdminCreateError?e.status:503);}
}
