import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
const schema=process.env.CLIENT_DATABASE_SCHEMA;
if(process.env.CLIENT_LEVEL_MAIL_TARGET!=='development'||process.env.NODE_ENV==='production'||process.env.VERCEL_ENV==='production'||!schema||['public','oc_customers'].includes(schema)||!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw Error('Este ejecutor solo admite esquemas explícitos de desarrollo. No admite producción.');
const supplied=process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL||process.env.DATABASE_URL;
if(!supplied)throw Error('Falta la conexión del entorno de desarrollo.');
const url=new URL(supplied);if(url.hostname.endsWith('.neon.tech')){url.hostname=url.hostname.replace('-pooler.','.');url.searchParams.set('sslmode','verify-full');}
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});let db;
try{db=await pool.connect();await db.query(`SET search_path TO "${schema}"`);await db.query(await readFile(new URL('../sql/clients/018-level-upgrade-mail.sql',import.meta.url),'utf8'));console.log('Cola de felicitaciones preparada en desarrollo. No se enviaron correos.');}
catch{if(db)await db.query('ROLLBACK').catch(()=>{});console.error('No se pudo completar la migración de felicitaciones.');process.exitCode=1;}finally{db?.release();await pool.end();}
