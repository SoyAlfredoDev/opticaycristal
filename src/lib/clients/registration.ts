import "server-only";
import { clientPool, clientTable } from "./db";
export async function registrationExists(email: string, rutHash: string) {
 const r = await clientPool().query(`SELECT 1 FROM ${clientTable("oc_client_user")} WHERE email=$1 OR "rutHash"=$2 LIMIT 1`,[email,rutHash]);
 return r.rows.length > 0;
}
