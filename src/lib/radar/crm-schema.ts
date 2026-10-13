import "server-only";
import { neon } from "@neondatabase/serverless";
import { ensureRadarSchema } from "./db";
export function crmSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Configura Neon para usar el CRM.");
  return neon(url);
}
let ready: Promise<void> | null = null;
export async function ensureCrmSchema() {
  if (ready) return ready;
  ready = (async () => {
    await ensureRadarSchema();
    const sql = crmSql();
    await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(712012, 1)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_contacts(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id),email text NOT NULL,name text NOT NULL DEFAULT '',role text NOT NULL DEFAULT '',consent_evidence text,consented_at timestamptz,status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','subscribed','unsubscribed')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(prospect_id,email))`,
      sql`ALTER TABLE radar_crm_contacts ALTER COLUMN consent_evidence DROP NOT NULL`,
      sql`ALTER TABLE radar_crm_contacts ALTER COLUMN consented_at DROP NOT NULL`,
      sql`ALTER TABLE radar_crm_contacts ALTER COLUMN status SET DEFAULT 'active'`,
      sql`ALTER TABLE radar_crm_contacts DROP CONSTRAINT IF EXISTS radar_crm_contacts_status_check`,
      sql`ALTER TABLE radar_crm_contacts ADD CONSTRAINT radar_crm_contacts_status_check CHECK(status IN ('active','pending','subscribed','unsubscribed'))`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_suppressions(email text PRIMARY KEY,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_tasks(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id),title text NOT NULL,owner text NOT NULL,due_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','cancelled')),result text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE INDEX IF NOT EXISTS radar_crm_tasks_due ON radar_crm_tasks(status,due_at)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_deals(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id),title text NOT NULL,offering text NOT NULL CHECK(offering IN ('convenio','jornada','ambas')),stage text NOT NULL DEFAULT 'calificacion' CHECK(stage IN ('calificacion','reunion','propuesta','negociacion','ganado','perdido')),amount numeric(14,0) NOT NULL DEFAULT 0 CHECK(amount>=0),owner text NOT NULL,next_action text NOT NULL,close_date date,loss_reason text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_campaigns(id text PRIMARY KEY,name text NOT NULL,objective text NOT NULL CHECK(objective IN ('convenio','jornada','ambas')),subject text NOT NULL,body text NOT NULL,variants jsonb NOT NULL,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','paused','archived')),approved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_deliveries(id text PRIMARY KEY,campaign_id text NOT NULL REFERENCES radar_crm_campaigns(id),contact_id text NOT NULL REFERENCES radar_crm_contacts(id),variant_id text NOT NULL,token text NOT NULL UNIQUE,status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed','uncertain','cancelled')),provider_id text UNIQUE,error text,attempted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,UNIQUE(campaign_id,contact_id))`,
      sql`ALTER TABLE radar_crm_deliveries ADD COLUMN IF NOT EXISTS recipient_email text`,
      sql`ALTER TABLE radar_crm_campaigns ADD COLUMN IF NOT EXISTS template_id text NOT NULL DEFAULT 'convenio'`,
      sql`UPDATE radar_crm_deliveries d SET recipient_email=c.email FROM radar_crm_contacts c WHERE c.id=d.contact_id AND d.recipient_email IS NULL`,
      sql`CREATE UNIQUE INDEX IF NOT EXISTS radar_crm_campaign_email_unique ON radar_crm_deliveries(campaign_id,recipient_email)`,
      sql`CREATE INDEX IF NOT EXISTS radar_crm_deliveries_queue ON radar_crm_deliveries(status,created_at)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_events(id text PRIMARY KEY,delivery_id text REFERENCES radar_crm_deliveries(id),prospect_id text REFERENCES radar_prospects(id),kind text NOT NULL,source text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),metadata jsonb NOT NULL DEFAULT '{}')`,
      sql`CREATE INDEX IF NOT EXISTS radar_crm_events_timeline ON radar_crm_events(prospect_id,occurred_at DESC)`,
      sql`CREATE INDEX IF NOT EXISTS radar_crm_events_delivery ON radar_crm_events(delivery_id,kind)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_webhooks(id text PRIMARY KEY,email_id text NOT NULL,kind text NOT NULL,occurred_at timestamptz NOT NULL,delivery_hint text,metadata jsonb NOT NULL DEFAULT '{}',processed boolean NOT NULL DEFAULT false,received_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_send_budget(day date PRIMARY KEY,used integer NOT NULL DEFAULT 0)`,
      sql`ALTER TABLE radar_prospects ADD COLUMN IF NOT EXISTS relationship_status text NOT NULL DEFAULT 'prospecto'`,
      sql`ALTER TABLE radar_crm_contacts ADD COLUMN IF NOT EXISTS marketing_ready boolean NOT NULL DEFAULT false`,
      sql`ALTER TABLE radar_crm_contacts ADD COLUMN IF NOT EXISTS ready_at timestamptz`,
      sql`UPDATE radar_crm_contacts SET marketing_ready=true,ready_at=consented_at WHERE status='subscribed' AND consented_at IS NOT NULL AND ready_at IS NULL`,
      sql`ALTER TABLE radar_crm_campaigns ADD COLUMN IF NOT EXISTS month text`,
      sql`ALTER TABLE radar_crm_campaigns ADD COLUMN IF NOT EXISTS scheduled_at timestamptz`,
      sql`ALTER TABLE radar_crm_campaigns ADD COLUMN IF NOT EXISTS expires_at timestamptz`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_followups(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id),contact_id text REFERENCES radar_crm_contacts(id),delivery_id text REFERENCES radar_crm_deliveries(id),external_id text UNIQUE,source text NOT NULL,subject text NOT NULL DEFAULT '',message text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','working','interested','proposal','closed','not_interested','quarantine','automatic')),owner text NOT NULL DEFAULT 'Equipo comercial',next_action text NOT NULL DEFAULT 'Revisar respuesta y contactar',due_at timestamptz NOT NULL DEFAULT now()+interval '1 day',received_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE INDEX IF NOT EXISTS radar_crm_followups_pending ON radar_crm_followups(status,due_at)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_inbound(id text PRIMARY KEY,event_id text NOT NULL UNIQUE,payload jsonb NOT NULL,processed boolean NOT NULL DEFAULT false,received_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_web_cache(website text PRIMARY KEY,data jsonb NOT NULL,checked_at timestamptz NOT NULL DEFAULT now())`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_recipient_schedule(email text PRIMARY KEY,delivery_id text NOT NULL,next_attempt_at timestamptz NOT NULL)`,
      sql`CREATE TABLE IF NOT EXISTS radar_crm_settings(key text PRIMARY KEY,value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`,
      sql`UPDATE radar_crm_contacts c SET status='active' WHERE c.status='pending' AND NOT EXISTS(SELECT 1 FROM radar_crm_suppressions s WHERE s.email=c.email)`,
      sql`INSERT INTO radar_crm_contacts(id,prospect_id,email,status) SELECT DISTINCT 'radar:'||md5(p.id||':'||lower(trim(e.email))),p.id,lower(trim(e.email)),CASE WHEN s.email IS NULL THEN 'active' ELSE 'unsubscribed' END FROM radar_prospects p CROSS JOIN LATERAL jsonb_array_elements_text(p.emails) e(email) LEFT JOIN radar_crm_suppressions s ON s.email=lower(trim(e.email)) WHERE length(trim(e.email))<=254 AND trim(e.email) ~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$' ON CONFLICT(prospect_id,email) DO NOTHING`,
    ]);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
