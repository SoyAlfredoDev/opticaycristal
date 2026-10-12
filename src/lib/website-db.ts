import "server-only";
import { neon } from "@neondatabase/serverless";

export function websiteDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function client() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("Falta DATABASE_URL para guardar solicitudes y pedidos.");
  return neon(url);
}

let schema: Promise<void> | null = null;
async function ensureSchema() {
  if (!schema) {
    schema = (async () => {
      const sql = client();
      await sql`CREATE TABLE IF NOT EXISTS website_requests (id text PRIMARY KEY, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS website_orders (id text PRIMARY KEY, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE INDEX IF NOT EXISTS website_requests_created_idx ON website_requests(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS website_orders_created_idx ON website_orders(created_at DESC)`;
    })().catch(error => { schema = null; throw error; });
  }
  return schema;
}

// Table names are selected from a closed union; all user values are SQL parameters.
export function websiteStore<T extends { id: string }>(kind: "requests" | "orders") {
  return {
    async list(): Promise<T[]> {
      await ensureSchema();
      const sql = client();
      const rows = kind === "requests"
        ? await sql`SELECT payload FROM website_requests ORDER BY created_at DESC, id DESC`
        : await sql`SELECT payload FROM website_orders ORDER BY created_at DESC, id DESC`;
      return rows.map(row => row.payload as T);
    },
    async get(id: string): Promise<T | null> {
      await ensureSchema();
      const sql = client();
      const rows = kind === "requests"
        ? await sql`SELECT payload FROM website_requests WHERE id=${id}`
        : await sql`SELECT payload FROM website_orders WHERE id=${id}`;
      return rows[0] ? rows[0].payload as T : null;
    },
    async create(record: T): Promise<T> {
      await ensureSchema();
      const sql = client();
      const payload = JSON.stringify(record);
      if (kind === "requests") await sql`INSERT INTO website_requests(id,payload) VALUES(${record.id},${payload}::jsonb)`;
      else await sql`INSERT INTO website_orders(id,payload) VALUES(${record.id},${payload}::jsonb)`;
      return record;
    },
    async update(id: string, patch: Partial<T>): Promise<boolean> {
      await ensureSchema();
      const sql = client();
      const payload = JSON.stringify(patch);
      const rows = kind === "requests"
        ? await sql`UPDATE website_requests SET payload=payload || ${payload}::jsonb WHERE id=${id} RETURNING id`
        : await sql`UPDATE website_orders SET payload=payload || ${payload}::jsonb WHERE id=${id} RETURNING id`;
      return rows.length > 0;
    },
  };
}
