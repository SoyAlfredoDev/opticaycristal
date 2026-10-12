import "server-only";
import {neon} from "@neondatabase/serverless";
import {getCommercialFit,type Activity,type CompanyResult,type FieldEvidence,type Prospect,type ProspectStage} from "./types";
import {prospectIdentity} from "./identity";

function client(){const url=process.env.DATABASE_URL?.trim();if(!url)throw new Error("Configura DATABASE_URL para guardar y consultar prospectos en Neon.");return neon(url)}
let schemaPromise:Promise<void>|null=null;
export async function ensureRadarSchema(){
 if(schemaPromise)return schemaPromise;
 schemaPromise=(async()=>{const sql=client();
  await sql`CREATE TABLE IF NOT EXISTS radar_prospects(id text PRIMARY KEY,provider_id text NOT NULL,name text NOT NULL,address text,website text,phone text,maps_url text,categories jsonb NOT NULL DEFAULT '[]'::jsonb,source text NOT NULL,fetched_at timestamptz NOT NULL,stage text NOT NULL DEFAULT 'nuevo' CHECK(stage IN ('nuevo','contactado','oportunidad','ganado','descartado')),notes text NOT NULL DEFAULT '',rut text,legal_name text,economic_activities jsonb NOT NULL DEFAULT '[]'::jsonb,economic_description text,official_source text,official_fetched_at timestamptz,employee_estimate integer,employee_estimate_source text,commercial_fit text NOT NULL DEFAULT 'por_clasificar',dedupe_key text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(source,provider_id))`;
  await sql`ALTER TABLE radar_prospects ADD COLUMN IF NOT EXISTS rut text, ADD COLUMN IF NOT EXISTS legal_name text, ADD COLUMN IF NOT EXISTS economic_activities jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS economic_description text, ADD COLUMN IF NOT EXISTS official_source text, ADD COLUMN IF NOT EXISTS official_fetched_at timestamptz, ADD COLUMN IF NOT EXISTS employee_estimate integer, ADD COLUMN IF NOT EXISTS employee_estimate_source text, ADD COLUMN IF NOT EXISTS commercial_fit text NOT NULL DEFAULT 'por_clasificar', ADD COLUMN IF NOT EXISTS dedupe_key text, ADD COLUMN IF NOT EXISTS region text, ADD COLUMN IF NOT EXISTS emails jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS web_checked_at timestamptz, ADD COLUMN IF NOT EXISTS web_status text`;
  await sql`CREATE TABLE IF NOT EXISTS radar_activities(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id) ON DELETE CASCADE,kind text NOT NULL CHECK(kind IN ('llamada','correo','reunion','nota')),note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS radar_identities(alias_key text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id) ON DELETE CASCADE)`;
  await sql`CREATE INDEX IF NOT EXISTS radar_prospects_stage_created_idx ON radar_prospects(stage,created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS radar_activities_prospect_created_idx ON radar_activities(prospect_id,created_at DESC)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS radar_prospects_dedupe_key_unique ON radar_prospects(dedupe_key) WHERE dedupe_key IS NOT NULL`;
  const legacy=await sql`SELECT id,provider_id AS "providerId",name,address,website,rut,source FROM radar_prospects WHERE dedupe_key IS NULL OR dedupe_key LIKE 'osm-name:%' ORDER BY created_at,id`;
  for(const row of legacy as Array<Prospect>){const key=prospectIdentity(row);await sql`UPDATE radar_prospects SET dedupe_key=${key} WHERE id=${row.id} AND NOT EXISTS(SELECT 1 FROM radar_prospects WHERE dedupe_key=${key} AND id<>${row.id})`}
  await sql`INSERT INTO radar_identities(alias_key,prospect_id) SELECT 'provider:'||source||'|'||provider_id,id FROM radar_prospects ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO radar_identities(alias_key,prospect_id) SELECT 'identity:'||dedupe_key,id FROM radar_prospects WHERE dedupe_key IS NOT NULL ON CONFLICT DO NOTHING`;
 })().catch(error=>{schemaPromise=null;throw error});return schemaPromise;
}
function fromRow(row:Record<string,unknown>):Prospect {
 return {id:row.id,providerId:row.provider_id,name:row.name,address:row.address,website:row.website,phone:row.phone,mapsUrl:row.maps_url,categories:row.categories,source:row.source,fetchedAt:row.fetched_at,stage:row.stage,notes:row.notes,rut:row.rut,legalName:row.legal_name,economicActivities:row.economic_activities,economicDescription:row.economic_description,officialSource:row.official_source,officialFetchedAt:row.official_fetched_at,employeeEstimate:row.employee_estimate,employeeEstimateSource:row.employee_estimate_source,commercialFit:row.commercial_fit,createdAt:row.created_at,region:row.region,emails:row.emails||[],socialLinks:row.social_links||[],evidence:row.evidence||[],webCheckedAt:row.web_checked_at,webStatus:row.web_status} as Prospect;
}
export async function listProspects():Promise<Prospect[]>{await ensureRadarSchema();const sql=client();return (await sql`SELECT * FROM radar_prospects ORDER BY created_at DESC,id`).map(row=>fromRow(row))}
export async function listProspectPage(limit:number,cursor:string|null,stage:string|null){await ensureRadarSchema();const sql=client();const rows=await sql`SELECT * FROM radar_prospects WHERE (${stage}::text IS NULL OR stage=${stage}) AND (${cursor}::text IS NULL OR (created_at,id)<(SELECT created_at,id FROM radar_prospects WHERE id=${cursor})) ORDER BY created_at DESC,id DESC LIMIT ${limit+1}`;return {prospects:rows.slice(0,limit).map(row=>fromRow(row)),nextCursor:rows.length>limit?String(rows[limit-1].id):null}}
export async function getProspect(id:string):Promise<Prospect|null>{await ensureRadarSchema();const sql=client(),rows=await sql`SELECT * FROM radar_prospects WHERE id=${id} LIMIT 1`;return rows[0]?fromRow(rows[0]):null}

export async function saveProspectWithStatus(c:CompanyResult):Promise<{prospect:Prospect;created:boolean}>{
 await ensureRadarSchema();const sql=client(),dedupeKey=prospectIdentity(c),providerAlias=`provider:${c.source}|${c.providerId}`,identityAlias=`identity:${dedupeKey}`;
 const find=()=>sql`SELECT p.* FROM radar_prospects p WHERE (p.source=${c.source} AND p.provider_id=${c.providerId}) OR p.dedupe_key=${dedupeKey} OR p.id IN(SELECT prospect_id FROM radar_identities WHERE alias_key IN(${providerAlias},${identityAlias})) ORDER BY CASE WHEN p.source=${c.source} AND p.provider_id=${c.providerId} THEN 0 ELSE 1 END,p.created_at,p.id LIMIT 1`;
 const merge=async(row:Record<string,unknown>)=>{
  const old=fromRow(row);
  const rows=await sql`UPDATE radar_prospects SET address=COALESCE(address,${c.address}),website=COALESCE(website,${c.website}),phone=COALESCE(phone,${c.phone}),region=COALESCE(region,${c.region??null}),categories=(SELECT COALESCE(jsonb_agg(value),'[]'::jsonb) FROM (SELECT DISTINCT value FROM jsonb_array_elements(categories||${JSON.stringify(c.categories)}::jsonb)) merged),emails=(SELECT COALESCE(jsonb_agg(value),'[]'::jsonb) FROM (SELECT DISTINCT value FROM jsonb_array_elements(emails||${JSON.stringify(c.emails||[])}::jsonb)) merged),social_links=(SELECT COALESCE(jsonb_agg(value),'[]'::jsonb) FROM (SELECT DISTINCT value FROM jsonb_array_elements(social_links||${JSON.stringify(c.socialLinks||[])}::jsonb)) merged),evidence=(SELECT COALESCE(jsonb_agg(value),'[]'::jsonb) FROM (SELECT DISTINCT ON(value->>'field',value->>'value',value->>'url') value FROM jsonb_array_elements(evidence||${JSON.stringify(c.evidence||[])}::jsonb) ORDER BY value->>'field',value->>'value',value->>'url',value->>'fetchedAt' DESC LIMIT 200) merged),employee_estimate=COALESCE(employee_estimate,${c.employeeEstimate??null}),employee_estimate_source=COALESCE(employee_estimate_source,${c.employeeEstimateSource??null}),commercial_fit=CASE WHEN COALESCE(employee_estimate,${c.employeeEstimate??null}::integer) IS NULL THEN 'por_clasificar' WHEN COALESCE(employee_estimate,${c.employeeEstimate??null}::integer)<5 THEN 'convenio_bajo' WHEN COALESCE(employee_estimate,${c.employeeEstimate??null}::integer)>20 THEN 'ambas' ELSE 'convenio' END WHERE id=${old.id} RETURNING *`;
  return fromRow(rows[0]);
 };
 let existing=(await find())[0],prospect:Prospect,created=false;
 if(existing)prospect=await merge(existing);
 else {
  try{
   const rows=await sql`INSERT INTO radar_prospects(id,provider_id,name,address,website,phone,maps_url,categories,source,fetched_at,employee_estimate,employee_estimate_source,commercial_fit,dedupe_key,region,emails,social_links,evidence) VALUES(${crypto.randomUUID()},${c.providerId},${c.name},${c.address},${c.website},${c.phone},${c.mapsUrl},${JSON.stringify(c.categories)}::jsonb,${c.source},${c.fetchedAt},${c.employeeEstimate??null},${c.employeeEstimateSource??null},${getCommercialFit(c.employeeEstimate)},${dedupeKey},${c.region??null},${JSON.stringify(c.emails||[])}::jsonb,${JSON.stringify(c.socialLinks||[])}::jsonb,${JSON.stringify(c.evidence||[])}::jsonb) ON CONFLICT (source,provider_id) DO NOTHING RETURNING *`;
   if(rows[0]){prospect=fromRow(rows[0]);created=true}else{existing=(await find())[0];if(!existing)throw new Error("No se pudo confirmar el guardado.");prospect=await merge(existing)}
  }catch(error){if((error as {code?:string}).code!=="23505")throw error;existing=(await find())[0];if(!existing)throw error;prospect=await merge(existing)}
 }
 await sql`INSERT INTO radar_identities(alias_key,prospect_id) VALUES(${providerAlias},${prospect.id}),(${identityAlias},${prospect.id}) ON CONFLICT DO NOTHING`;
 return {prospect,created};
}
export async function saveProspect(c:CompanyResult):Promise<Prospect>{return(await saveProspectWithStatus(c)).prospect}
export async function saveOfficialData(id:string,data:{rut:string;legalName:string;activities:string[];description:string|null;source:string;fetchedAt:string}){
 const existing=await getProspect(id);if(!existing)return null;const sql=client(),dedupeKey=prospectIdentity({...existing,rut:data.rut});
 try{const rows=await sql`UPDATE radar_prospects SET rut=${data.rut},legal_name=${data.legalName},economic_activities=${JSON.stringify(data.activities)}::jsonb,economic_description=${data.description},official_source=${data.source},official_fetched_at=${data.fetchedAt},dedupe_key=${dedupeKey} WHERE id=${id} RETURNING *`;await sql`INSERT INTO radar_identities(alias_key,prospect_id) VALUES(${'identity:'+dedupeKey},${id}) ON CONFLICT DO NOTHING`;return rows[0]?fromRow(rows[0]):null}catch(error){if((error as {code?:string}).code==="23505")throw new Error("Ese RUT ya pertenece a otro prospecto. Revisa las fichas antes de asociarlo.");throw error}
}
export type WebEnrichment={emails:string[];phones:string[];socialLinks:string[];evidence:FieldEvidence[];employeeEstimate:number|null;fetchedAt:string;status:string};
function mergeEvidence(a:FieldEvidence[],b:FieldEvidence[]){return [...a,...b].filter((entry,index,array)=>array.findIndex(other=>other.field===entry.field&&other.value===entry.value&&other.url===entry.url)===index).slice(-200)}
export async function saveWebData(id:string,data:WebEnrichment){
 const p=await getProspect(id);if(!p)return null;const sql=client();
 const workers=data.employeeEstimate??p.employeeEstimate??null,workerSource=data.employeeEstimate!=null?data.evidence.find(e=>e.field==="employeeEstimate")?.url??null:p.employeeEstimateSource??null;
 const rows=await sql`UPDATE radar_prospects SET emails=${JSON.stringify([...new Set([...(p.emails||[]),...data.emails])])}::jsonb,social_links=${JSON.stringify([...new Set([...(p.socialLinks||[]),...data.socialLinks])])}::jsonb,phone=COALESCE(phone,${data.phones[0]??null}),evidence=${JSON.stringify(mergeEvidence(p.evidence||[],data.evidence))}::jsonb,employee_estimate=${workers},employee_estimate_source=${workerSource},commercial_fit=${getCommercialFit(workers)},web_checked_at=${data.fetchedAt},web_status=${data.status} WHERE id=${id} RETURNING *`;
 return rows[0]?fromRow(rows[0]):null;
}
export async function updateProspect(id:string,v:{stage?:ProspectStage;notes?:string}){
 await ensureRadarSchema();const sql=client();const rows=await sql`UPDATE radar_prospects SET stage=COALESCE(${v.stage??null}::text,stage),notes=COALESCE(${v.notes??null}::text,notes) WHERE id=${id} RETURNING id`;return rows.length>0;
}
export async function addActivity(pid:string,kind:Activity["kind"],note:string){await ensureRadarSchema();const sql=client();const rows=await sql`INSERT INTO radar_activities(id,prospect_id,kind,note) VALUES(${crypto.randomUUID()},${pid},${kind},${note}) RETURNING id,prospect_id AS "prospectId",kind,note,created_at AS "createdAt"`;return rows[0] as unknown as Activity}
export async function listActivities(pid:string):Promise<Activity[]>{await ensureRadarSchema();const sql=client();const rows=await sql`SELECT id,prospect_id AS "prospectId",kind,note,created_at AS "createdAt" FROM radar_activities WHERE prospect_id=${pid} ORDER BY created_at DESC LIMIT 100`;return rows as unknown as Activity[]}
export async function listRecentActivities():Promise<Array<Activity&{companyName:string}>>{await ensureRadarSchema();const sql=client();return await sql`SELECT a.id,a.prospect_id AS "prospectId",a.kind,a.note,a.created_at AS "createdAt",p.name AS "companyName" FROM radar_activities a JOIN radar_prospects p ON p.id=a.prospect_id ORDER BY a.created_at DESC,a.id LIMIT 100` as Array<Activity&{companyName:string}>}
