import { Pool } from "pg";
import { readFile } from "node:fs/promises";
const schema = process.env.CLIENT_DATABASE_SCHEMA;
if (!schema || schema === "public" || !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error("Configura un esquema de clientes explícito, distinto de public.");
const supplied = process.env.CLIENT_DATABASE_URL_UNPOOLED || process.env.CLIENT_DATABASE_URL || process.env.DATABASE_URL;
if (!supplied) throw new Error("Falta la conexión de clientes.");
const url = new URL(supplied);
if (url.hostname.endsWith(".neon.tech")) { url.hostname = url.hostname.replace("-pooler.", "."); url.searchParams.set("sslmode", "verify-full"); }
const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 10000 });
let db;
try {
  db = await pool.connect();
  await db.query(`SET search_path TO "${schema}"`);
  await db.query(await readFile(new URL("../sql/clients/015-level-benefits.sql", import.meta.url), "utf8"));
  console.log("Migración 015 de niveles e historial completada. No se modificaron los beneficios vigentes.");
} catch {
  if (db) await db.query("ROLLBACK").catch(() => {});
  console.error("No se pudo completar la migración 015 de niveles."); process.exitCode = 1;
} finally { db?.release(); await pool.end(); }
