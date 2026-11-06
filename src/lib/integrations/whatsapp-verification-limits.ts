import "server-only";
import {isIP} from "node:net";
import type {PoolClient} from "pg";
import {clientPool,clientTable as t} from "@/lib/clients/db";
import {clientFingerprint} from "@/lib/clients/privacy";

export class WhatsappVerificationError extends Error {
  constructor(message:string,public status=400,public retryAfterSeconds=0){super(message);}
}

// IP is only an extra signal. Account, phone and global limits remain effective
// even if a proxy header is absent or forged outside our trusted hosting edge.
export function whatsappRequestIp(request:Request){
  const raw=(request.headers.get("x-real-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"").trim();
  const family=raw.length<=128&&!raw.includes("%")?isIP(raw):0;
  if(family===4)return raw;
  if(family===6){
    // URL normalizes compressed IPv6; group by /64 to limit address rotation.
    const host=new URL(`http://[${raw}]/`).hostname.slice(1,-1);
    const [left,right=""]=host.split("::");
    const a=left?left.split(":"):[],b=right?right.split(":"):[];
    return [...a,...Array(8-a.length-b.length).fill("0"),...b].slice(0,4).map(p=>p.padStart(4,"0")).join(":")+"::/64";
  }
  return "unknown";
}

type Limit={value:string;purpose:string;seconds:number;max:number};
async function consume(db:Pick<PoolClient,"query">,limits:Limit[]){
  // Shared PostgreSQL counters, not per-process memory: safe across instances.
  for(const limit of limits){
    const key=clientFingerprint(limit.value,`wa-verification:${limit.purpose}`);
    const result=await db.query(`INSERT INTO ${t("oc_client_registration_limit")} AS c(key,count,reset_at)
      VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE
      SET count=CASE WHEN c.reset_at<=now() THEN 1 ELSE LEAST(c.count+1,$3+1) END,
      reset_at=CASE WHEN c.reset_at<=now() THEN now()+($2*interval '1 second') ELSE c.reset_at END
      RETURNING count,GREATEST(1,ceil(extract(epoch from reset_at-now())))::int AS retry`,[key,limit.seconds,limit.max]);
    if(Number(result.rows[0].count)>limit.max)return Number(result.rows[0].retry);
  }
  return 0;
}

export async function limitWhatsappIssue(db:PoolClient,userId:string,phoneHash:string,ip:string){
  const limits:Limit[]=[
    {value:"all",purpose:"issue-global-hour",seconds:3600,max:120},
    {value:"all",purpose:"issue-global-day",seconds:86400,max:500},
    ...[["account",userId],["phone",phoneHash]].flatMap(([kind,value])=>[
      {value,purpose:`issue-${kind}-hour`,seconds:3600,max:3},
      {value,purpose:`issue-${kind}-day`,seconds:86400,max:6}
    ]),
    {value:ip,purpose:"issue-ip-hour",seconds:3600,max:10},
    {value:ip,purpose:"issue-ip-day",seconds:86400,max:30}
  ];
  const retry=await consume(db,limits);
  if(retry)throw new WhatsappVerificationError("Alcanzaste el límite de verificaciones. Inténtalo más tarde.",429,retry);
}

export async function limitWhatsappStatus(userId:string,ip:string){
  const retry=await consume(clientPool(),[
    {value:userId,purpose:"status-account",seconds:60,max:30},
    {value:ip,purpose:"status-ip",seconds:60,max:120}
  ]);
  if(retry)throw new WhatsappVerificationError("Espera antes de consultar otra vez.",429,retry);
}

// Excess signed messages are acknowledged without doing customer lookups or
// sending replies. A 429 here would amplify traffic through provider retries.
export async function allowWhatsappReceipt(db:PoolClient,phoneHash?:string){
  return !await consume(db,phoneHash?[
    {value:phoneHash,purpose:"receipt-phone-minute",seconds:60,max:10},
    {value:phoneHash,purpose:"receipt-phone-hour",seconds:3600,max:30}
  ]:[{value:"all",purpose:"receipt-global",seconds:60,max:300}]);
}

// Separate durable budget for guesses, including malformed or stale requests.
export async function limitWhatsappConfirmation(userId:string,ip:string){
  const retry=await consume(clientPool(),[
    {value:"all",purpose:"confirm-global",seconds:60,max:600},
    {value:userId,purpose:"confirm-account",seconds:900,max:15},
    {value:ip,purpose:"confirm-ip",seconds:900,max:60}
  ]);
  if(retry)throw new WhatsappVerificationError("Demasiados intentos. Inténtalo más tarde.",429,retry);
}
