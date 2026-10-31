import nextEnv from "@next/env";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd(), true);
const schema = process.env.CLIENT_DATABASE_SCHEMA;
if (!schema || !/^[a-z][a-z0-9_]{0,62}$/.test(schema) || schema === "public") throw new Error("Configura CLIENT_DATABASE_SCHEMA con un esquema de clientes explícito, distinto de public.");
const supplied = process.env.CLIENT_DATABASE_URL_UNPOOLED || process.env.CLIENT_DATABASE_URL || process.env.DATABASE_URL;
if (!supplied) throw new Error("Falta la conexión de base de datos.");
const url = new URL(supplied);
// Neon publishes the direct endpoint by removing -pooler; schema migrations require a direct connection.
if (url.hostname.endsWith(".neon.tech")) { url.hostname = url.hostname.replace("-pooler.", ".");url.searchParams.set("sslmode", "verify-full"); }
const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 10000 });
const client = await pool.connect();
try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(await readFile("sql/clients/001-customers.sql", "utf8"));
  await client.query(await readFile("sql/clients/002-sales.sql", "utf8"));
  await client.query(await readFile("sql/clients/003-audit.sql", "utf8"));
  await client.query(await readFile("sql/clients/004-support.sql", "utf8"));
  await client.query(await readFile("sql/clients/005-support-mail.sql", "utf8"));
  await client.query(await readFile("sql/clients/006-categories.sql", "utf8"));
  await client.query(await readFile("sql/clients/007-installments.sql", "utf8"));
  await client.query(await readFile("sql/clients/008-admin-notifications.sql", "utf8"));
  const { rows } = await client.query("SELECT code,name,max_percent,max_amount,max_installments FROM oc_client_tiers ORDER BY position");
  console.log(JSON.stringify({ schema, categories: rows }, null, 2));
} catch {
  await client.query("ROLLBACK").catch(() => {});
  process.exitCode = 1;
  console.error("No se pudo aplicar la migración de clientes. No se muestran datos de conexión ni información personal.");
} finally { client.release();await pool.end(); }
