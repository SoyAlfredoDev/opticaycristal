// Explicit maintenance only: never runs on import, request, deployment or a schedule.
import nextEnv from '@next/env';
import {Pool} from 'pg';
async function main(){
 nextEnv.loadEnvConfig(process.cwd());
 if(process.env.CRIS_PURGE_TARGET!=='configured-environment')throw Error('Explicit maintenance target required.');
 const schema=process.env.CLIENT_DATABASE_SCHEMA;if(!schema||!/^oc_customers[a-z0-9_]*$/.test(schema))throw Error('An explicit schema is required.');
 const uri=new URL(process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL||'');if(uri.hostname.endsWith('.neon.tech'))uri.searchParams.set('sslmode','verify-full');
 const pool=new Pool({connectionString:uri.toString(),max:1,connectionTimeoutMillis:8000});let db;
 try{db=await pool.connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='10s'");const attachments=await db.query(`DELETE FROM "${schema}".oc_client_cris_attachments WHERE expires_at<=now()`);const nonces=await db.query(`DELETE FROM "${schema}".oc_client_cris_nonces WHERE expires_at<=now()`);await db.query('COMMIT');console.log(JSON.stringify({attachmentsPurged:attachments.rowCount,noncesPurged:nonces.rowCount}));}catch{await db?.query('ROLLBACK').catch(()=>{});throw Error('Maintenance failed.');}finally{db?.release();await pool.end();}
}
main().catch(()=>{console.error('Maintenance not completed. No credentials were printed.');process.exitCode=1;});
