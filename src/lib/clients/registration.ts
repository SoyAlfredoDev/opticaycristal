import "server-only";
import { clientPool, clientTable } from "./db";
import type { RegistrationWelcome } from "./types";
export async function registrationWelcome(): Promise<RegistrationWelcome> {
 const row=(await clientPool().query(`SELECT name,max_amount,max_percent,max_installments FROM ${clientTable("oc_client_tiers")} WHERE code='start'`)).rows[0];
 if(!row || ![row.max_amount,row.max_percent,row.max_installments].every(v=>Number.isSafeInteger(Number(v))&&Number(v)>0)) throw new Error("Nivel inicial no disponible.");
 return {tierName:String(row.name),maxAmount:Number(row.max_amount),maxPercent:Number(row.max_percent),maxInstallments:Number(row.max_installments)};
}
export async function registrationExists(email: string, rutHash: string) {
 const r = await clientPool().query(`SELECT 1 FROM ${clientTable("oc_client_user")} WHERE email=$1 OR "rutHash"=$2 LIMIT 1`,[email,rutHash]);
 return r.rows.length > 0;
}
