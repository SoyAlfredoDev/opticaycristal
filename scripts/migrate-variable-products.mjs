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
try{
 await db.query(`SET search_path TO "${schema}"`);
 // Allow a variable catalog cost; historical sale costs remain mandatory and unchanged.
 await db.query(await readFile("sql/clients/011-variable-product-cost.sql","utf8"));
 console.log("Migración 011 de productos de costo variable completada.");
}catch{await db.query("ROLLBACK");console.error("No se pudo completar la migración de productos variables.");process.exitCode=1;}
finally{db.release();await pool.end();}
