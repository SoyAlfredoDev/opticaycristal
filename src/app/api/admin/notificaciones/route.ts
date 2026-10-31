import {getSession} from '@/lib/auth';
import {customerAdminSession} from '@/lib/clients/admin';
import {privateJson,readClientBody,sameClientOrigin} from '@/lib/clients/http';
import {getAdminNotifications,markAdminNotificationsRead,NotificationError} from '@/lib/admin/notifications';
export const runtime='nodejs';
async function access(){const session=await getSession();if(!session)return {error:privateJson({error:'Inicia sesión para ver los avisos.'},401)};if(!await customerAdminSession())return {error:privateJson({error:'No tienes permiso para ver estos avisos.'},403)};return {actor:session.u};}
function failed(error:unknown){return privateJson({error:error instanceof NotificationError?error.message:'No pudimos cargar los avisos. Inténtalo de nuevo.'},error instanceof NotificationError?error.status:503);}
export async function GET(request:Request){const auth=await access();if(auth.error)return auth.error;const q=new URL(request.url).searchParams;try{return privateJson(await getAdminNotifications(auth.actor!,{unread:q.get('unread')==='1',offset:Number(q.get('offset')||0),limit:Number(q.get('limit')||50)}));}catch(error){return failed(error);}}
export async function POST(request:Request){const auth=await access();if(auth.error)return auth.error;if(!sameClientOrigin(request))return privateJson({error:'Origen no permitido.'},403);let body:unknown;try{body=await readClientBody(request);}catch{return privateJson({error:'Datos no válidos.'},400);}try{await markAdminNotificationsRead(auth.actor!,body);return privateJson({ok:true});}catch(error){return error instanceof NotificationError?failed(error):privateJson({error:'No pudimos actualizar el aviso. Reintenta con los mismos datos.'},503);}}
