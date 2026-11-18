import 'server-only';
import {clientPool,clientTable as t} from './db';
import {clientFingerprint} from './privacy';

export class AdminCreateError extends Error {
 constructor(message:string,public status=400){super(message);}
}
export async function limitStaffCustomerAction(value:string,purpose:string,max:number,seconds=3600){
 const r=await clientPool().query(`INSERT INTO ${t('oc_client_registration_limit')} AS c(key,count,reset_at)
 VALUES($1,1,now()+($3*interval '1 second')) ON CONFLICT(key) DO UPDATE
 SET count=CASE WHEN c.reset_at<=now() THEN 1 ELSE LEAST(c.count+1,$2+1) END,
 reset_at=CASE WHEN c.reset_at<=now() THEN now()+($3*interval '1 second') ELSE c.reset_at END RETURNING count`,[clientFingerprint(value,'staff-customer:'+purpose),max,seconds]);
 if(r.rows[0].count>max)throw new AdminCreateError('Espera antes de volver a intentarlo.',429);
}
