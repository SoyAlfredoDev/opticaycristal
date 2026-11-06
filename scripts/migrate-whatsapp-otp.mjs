import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
const schema=process.env.CLIENT_DATABASE_SCHEMA;
if(!schema||schema==='public'||!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw Error('Configura un esquema explícito de clientes.');
if(process.env.WHATSAPP_OTP_MIGRATION_CONFIRM!=='004')throw Error('Requiere WHATSAPP_OTP_MIGRATION_CONFIRM=004.');
const supplied=process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL||process.env.DATABASE_URL;
if(!supplied)throw Error('Falta la conexión de clientes.');
const url=new URL(supplied);if(url.hostname.endsWith('.neon.tech')){url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('sslmode','verify-full');}
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});const db=await pool.connect();
try{
 await db.query(`SET search_path TO "${schema}"`);
 const prerequisite=await db.query('SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema=$1 AND table_name=ANY($2)',[schema,['oc_client_user','oc_client_whatsapp_challenges','oc_client_whatsapp_receipts','oc_client_registration_limit']]);
 if(prerequisite.rows[0].n!==4)throw Error('Faltan migraciones previas.');
 await db.query(await readFile('sql/integrations/004-whatsapp-otp.sql','utf8'));
 const result=await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema=$1 AND table_name='oc_client_whatsapp_otps'",[schema]);
 if(result.rows[0].n!==1)throw Error('Verificación fallida.');
 console.log(JSON.stringify({migration:'004-whatsapp-otp',applied:true,customerRecordsModified:false,messagesSent:false}));
}catch{await db.query('ROLLBACK').catch(()=>{});console.error('No se pudo completar la migración WhatsApp OTP 004.');process.exitCode=1;}
finally{db.release();await pool.end();}
