import {createHash,timingSafeEqual} from 'node:crypto';
import {drainLevelUpgradeMail} from '@/lib/clients/level-mail';
import {privateJson} from '@/lib/clients/http';
export const runtime='nodejs';
export const maxDuration=60;
/** Bounded daily fallback; the normal first attempt runs after the level change. */
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!secret||!token||!timingSafeEqual(createHash('sha256').update(secret).digest(),createHash('sha256').update(token).digest()))return privateJson({error:'Acceso restringido.'},401);
 try{let accepted=0;for(let i=0;i<3;i++){const result=await drainLevelUpgradeMail();if(result.disabled)return privateJson(result);accepted+=result.accepted;}return privateJson({accepted});}catch{return privateJson({error:'No se pudo procesar la cola de felicitaciones.'},503);}
}
