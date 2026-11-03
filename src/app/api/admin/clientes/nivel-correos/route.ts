import {createHash,timingSafeEqual} from 'node:crypto';
import {drainLevelUpgradeMail} from '@/lib/clients/level-mail';
import {privateJson} from '@/lib/clients/http';
export const runtime='nodejs';
export const maxDuration=60;
/** Scheduler entry point. No production schedule is installed by this change. */
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!secret||!token||!timingSafeEqual(createHash('sha256').update(secret).digest(),createHash('sha256').update(token).digest()))return privateJson({error:'Acceso restringido.'},401);
 try{return privateJson(await drainLevelUpgradeMail());}catch{return privateJson({error:'No se pudo procesar la cola de felicitaciones.'},503);}
}
