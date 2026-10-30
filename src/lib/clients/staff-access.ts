import "server-only";
import { createHmac } from "node:crypto";
import { clientPool, clientTable } from "./db";
export async function allowStaffLogin(ip: string) {
 const secret=process.env.SESSION_SECRET || "";
 if(secret.length<32) throw new Error("Staff access unavailable");
 const key=createHmac("sha256",secret).update(`staff-login:${ip.slice(0,200)}`).digest("hex");
 const r=await clientPool().query(`INSERT INTO ${clientTable("oc_client_admin_login_limits")} AS limits (key,count,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.reset_at<now() THEN 1 ELSE limits.count+1 END,reset_at=CASE WHEN limits.reset_at<now() THEN now()+interval '15 minutes' ELSE limits.reset_at END RETURNING count`,[key]);
 return Number(r.rows[0].count)<=8;
}
