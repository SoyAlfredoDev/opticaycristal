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
      sql`CREATE TABLE IF NOT EXISTS radar_crm_contacts(id text PRIMARY KEY,prospect_id text NOT NULL REFERENCES radar_prospects(id),email text NOT NULL,name text NOT NULL DEFAULT '',role text NOT NULL DEFAULT '',consent_evidence text NOT NULL CHECK(length(consent_evidence)>0),consented_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL DEFAULT 'subscribed' CHECK(status IN ('subscribed','unsubscribed')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(prospect_id,email))`,
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
    ]);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
