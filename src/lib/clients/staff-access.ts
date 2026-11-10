import "server-only";
import { createHmac } from "node:crypto";
import { privateJson } from "./http";
import { clientPool, clientTable } from "./db";

export async function allowStaffLogin(ip: string, username = "") {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("Staff access unavailable");
  const keys = [[`staff-login:${ip.slice(0, 200)}`, 8]] as [string, number][];
  const account = username.trim().toLowerCase();
  if (account && account.length <= 254) keys.push([`staff-login-account:${account}`, 12]);
  for (const [bucket, limit] of keys) {
    const key = createHmac("sha256", secret).update(bucket).digest("hex");
    const result = await clientPool().query(`INSERT INTO ${clientTable("oc_client_admin_login_limits")} AS limits
      (key,count,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE
      SET count=CASE WHEN limits.reset_at<now() THEN 1 ELSE LEAST(limits.count+1,$2+1) END,
      reset_at=CASE WHEN limits.reset_at<now() THEN now()+interval '15 minutes' ELSE limits.reset_at END
      RETURNING count`, [key, limit]);
    if (Number(result.rows[0].count) > limit) return false;
  }
  return true;
}

export async function staffLoginGate(ip: string, account: string) {
  try {
    if (await allowStaffLogin(ip, account)) return null;
    const response = privateJson({error:"Demasiados intentos. Espera unos minutos."},429);
    response.headers.set("Retry-After","900");
    return response;
  } catch {
    return privateJson({error:"Acceso temporalmente no disponible."},503);
  }
}
