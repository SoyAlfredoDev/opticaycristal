import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
const clients=process.env.CLIENT_DATABASE_SCHEMA,website=process.env.WEBSITE_DATABASE_SCHEMA;
const valid=s=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,62}$/.test(s)&&!['public','oc_customers'].includes(s);
if(process.env.ADMIN_NOTIFICATIONS_TARGET!=='development'||process.env.NODE_ENV==='production'||process.env.VERCEL_ENV==='production'||!valid(clients)||!valid(website))throw Error('Este ejecutor solo permite esquemas explícitos de desarrollo. No admite producción ni el esquema web público.');
const supplied=process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL||process.env.DATABASE_URL;
if(!supplied||!process.env.DATABASE_URL)throw Error('Faltan las conexiones del entorno de desarrollo.');
const url=new URL(supplied),webUrl=new URL(process.env.DATABASE_URL);
if(url.hostname.replace('-pooler.','.')!==webUrl.hostname.replace('-pooler.','.')||url.pathname!==webUrl.pathname)throw Error('Los avisos web requieren la misma base PostgreSQL que clientes, con sus esquemas seleccionados.');
if(url.hostname.endsWith('.neon.tech')){url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('sslmode','verify-full');}
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});let db;
try{
 db=await pool.connect();await db.query(`SET search_path TO "${clients}"`);
 await db.query("SELECT set_config('oc.website_schema',$1,false)",[website]);
 // Existing development schemas and base tables must be provisioned first.
 for(const file of ['016-business-notifications.sql','017-website-notifications.sql'])await db.query(await readFile(new URL('../sql/clients/'+file,import.meta.url),'utf8'));
 console.log('Avisos de negocio activados únicamente en los esquemas de desarrollo seleccionados. Sin envío de correos.');
}catch{if(db)await db.query('ROLLBACK').catch(()=>{});console.error('No se pudo completar la activación de avisos de desarrollo.');process.exitCode=1;}finally{db?.release();await pool.end();}
