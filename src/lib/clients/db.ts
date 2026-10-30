import "server-only";
import { Pool } from "pg";
let pool: Pool | undefined;
export function clientPool() {
  if (pool) return pool;
  const connectionString = process.env.CLIENT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("No está configurada la base de datos de clientes.");
  const url = new URL(connectionString);
  if (url.hostname.endsWith(".neon.tech")) url.searchParams.set("sslmode", "verify-full");
  pool = new Pool({ connectionString: url.toString(), max: 4, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 8_000 });
  return pool;
}

export function clientSchema() {
  const name = process.env.CLIENT_DATABASE_SCHEMA || "oc_customers";
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new Error("El esquema de clientes no es válido.");
  return name;
}
export function clientTable(name: string) {
  if (!/^oc_client_[a-z_]+$/.test(name)) throw new Error("Tabla de clientes no válida.");
  return `"${clientSchema()}"."${name}"`;
}
