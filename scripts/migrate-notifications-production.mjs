// Explicit release runner. Never invoked by build, dev or application requests.
import {Pool} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
const schema=process.env.CLIENT_DATABASE_SCHEMA,website=process.env.WEBSITE_DATABASE_SCHEMA||'public';
if(process.env.OC_RELEASE_TARGET!=='production'||schema!=='oc_customers'||website!=='public')throw Error('Explicit production release target and existing production schemas required');
const supplied=process.env.CLIENT_DATABASE_URL_UNPOOLED||process.env.CLIENT_DATABASE_URL;
if(!supplied||!process.env.DATABASE_URL)throw Error('Both existing database connections are required');
const url=new URL(supplied),web=new URL(process.env.DATABASE_URL);
if(url.hostname.replace('-pooler.','.')!==web.hostname.replace('-pooler.','.')||url.pathname!==web.pathname)throw Error('Client and website databases must match');
url.hostname=url.hostname.replace('-pooler.','.');if(url.hostname.endsWith('.neon.tech'))url.searchParams.set('sslmode','verify-full');
const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});let db;
const tables=['oc_client_user','oc_client_sales','oc_client_installments','oc_client_payments','oc_client_tiers','oc_client_category_changes','oc_client_commitments','oc_client_contract_settings'];
async function fingerprint(){const result={};for(const table of tables){const row=table==='oc_client_category_changes'?"(to_jsonb(r)-'source')::text":'row_to_json(r)::text';result[table]=(await db.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(${row},E'\\n' ORDER BY ${row}),'')) AS hash FROM "${schema}"."${table}" r`)).rows[0];}return result;}
try{
 db=await pool.connect();await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");await db.query(`SET LOCAL search_path TO "${schema}"`);
 // Briefly prevent concurrent business writes while comparing preservation hashes.
 await db.query(`LOCK TABLE ${tables.map(t=>`"${schema}"."${t}"`).join(',')},public.website_orders,public.website_requests IN SHARE ROW EXCLUSIVE MODE`);
 const before=await fingerprint();await db.query("SELECT set_config('oc.website_schema',$1,true)",[website]);
 for(const file of ['016-business-notifications.sql','017-website-notifications.sql','018-level-upgrade-mail.sql']){const sql=await readFile(new URL('../sql/clients/'+file,import.meta.url),'utf8');await db.query(sql.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));}
 // Migration 018 adds a source marker; compare the original history columns.
 const after=await fingerprint();
 for(const table of tables)if(JSON.stringify(before[table])!==JSON.stringify(after[table]))throw Error('Business data preservation check failed');
 await db.query('COMMIT');
 const evidence={at:new Date().toISOString(),schema,website,migrations:[16,17,18],businessRowsPreserved:true,before,after};
 if(process.env.OC_RELEASE_EVIDENCE)await writeFile(process.env.OC_RELEASE_EVIDENCE,JSON.stringify(evidence,null,2));
 console.log('Production notification migrations committed; business rows preserved. No messages sent.');
}catch(error){if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Release migration failed:',error.code||error.message);process.exitCode=1;}finally{db?.release();await pool.end();}
