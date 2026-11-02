import { Pool } from "pg";
import { readFile } from "node:fs/promises";

const schema=process.env.CLIENT_DATABASE_SCHEMA;
if(!schema||schema==="public"||!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw new Error("Configura un esquema de clientes explícito, distinto de public.");
const supplied=process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL||process.env.DATABASE_URL;
if(!supplied)throw new Error("Falta la conexión de clientes.");
const url=new URL(supplied);
if(url.hostname.endsWith(".neon.tech")){url.hostname=url.hostname.replace("-pooler.",".");url.searchParams.set("sslmode","verify-full");}
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});
const db=await pool.connect();
async function snapshot(){
 const tables=["oc_client_user","oc_client_sales","oc_client_installments","oc_client_payments","oc_client_credit_balances"];
 const result={};
 for(const table of tables)result[table]=(await db.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(x)::text,'' ORDER BY row_to_json(x)::text),'')) AS fingerprint FROM "${schema}"."${table}" x`)).rows[0];
 return JSON.stringify(result);
}
try{
 await db.query(`SET search_path TO "${schema}"`);
 const before=await snapshot();
 await db.query(await readFile("sql/clients/014-category-sale-pricing.sql","utf8"));
 const column=(await db.query(`SELECT is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='oc_client_sales' AND column_name='protected_cost'`,[schema])).rows[0];
 if(column?.is_nullable!=="YES")throw new Error("No se pudo verificar la columna opcional.");
 console.log(JSON.stringify({migration:14,applied:true,salesAndPaymentsUnchanged:before===await snapshot()}));
}catch{
 await db.query("ROLLBACK").catch(()=>{});
 console.error("No se pudo completar o verificar la migración 014.");
 process.exitCode=1;
}finally{db.release();await pool.end();}
