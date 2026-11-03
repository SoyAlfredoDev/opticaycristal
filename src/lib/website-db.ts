import "server-only";
import { neon } from "@neondatabase/serverless";
export function websiteDatabaseConfigured(){return Boolean(process.env.DATABASE_URL?.trim());}
export function websiteDatabaseSchema(){
 const schema=process.env.WEBSITE_DATABASE_SCHEMA?.trim()||'public';
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw new Error('El esquema web no es válido.');
 return schema;
}
function client(){const url=process.env.DATABASE_URL?.trim();if(!url)throw new Error('Falta DATABASE_URL para guardar solicitudes y pedidos.');return neon(url);}
function table(kind:'requests'|'orders'){return `"${websiteDatabaseSchema()}"."website_${kind}"`;}
let schema:Promise<void>|null=null;
async function ensureSchema(){
 if(!schema)schema=(async()=>{
  const sql=client();
  await sql.query(`CREATE TABLE IF NOT EXISTS ${table('requests')} (id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`);
  await sql.query(`CREATE TABLE IF NOT EXISTS ${table('orders')} (id text PRIMARY KEY,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`);
  await sql.query(`CREATE INDEX IF NOT EXISTS website_requests_created_idx ON ${table('requests')} (created_at DESC)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS website_orders_created_idx ON ${table('orders')} (created_at DESC)`);
 })().catch(error=>{schema=null;throw error;});
 return schema;
}
// Closed table union and validated schema; all record values stay parameterized.
export function websiteStore<T extends {id:string}>(kind:'requests'|'orders'){
 return{
  async list():Promise<T[]>{await ensureSchema();const rows=await client().query(`SELECT payload FROM ${table(kind)} ORDER BY created_at DESC,id DESC`);return rows.map(row=>row.payload as T);},
  async get(id:string):Promise<T|null>{await ensureSchema();const rows=await client().query(`SELECT payload FROM ${table(kind)} WHERE id=$1`,[id]);return rows[0]?rows[0].payload as T:null;},
  async create(record:T):Promise<T>{await ensureSchema();await client().query(`INSERT INTO ${table(kind)}(id,payload) VALUES($1,$2::jsonb)`,[record.id,JSON.stringify(record)]);return record;},
  async update(id:string,patch:Partial<T>):Promise<boolean>{await ensureSchema();const rows=await client().query(`UPDATE ${table(kind)} SET payload=payload || $2::jsonb WHERE id=$1 RETURNING id`,[id,JSON.stringify(patch)]);return rows.length>0;},
 };
}
