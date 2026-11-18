import nextEnv from "@next/env";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";

nextEnv.loadEnvConfig(process.cwd(), true);
const schema = process.env.CLIENT_DATABASE_SCHEMA;
if (!schema || schema === "public" || !/^[a-z][a-z0-9_]{0,62}$/.test(schema) || schema !== process.argv[2]) {
    throw new Error("Indica explícitamente el mismo esquema de CLIENT_DATABASE_SCHEMA como argumento.");
}

const supplied = process.env.CLIENT_DATABASE_URL_UNPOOLED || process.env.CLIENT_DATABASE_URL || process.env.DATABASE_URL;
if (!supplied) throw new Error("Falta configurar la base de datos de clientes.");
const connection = new URL(supplied);
if (connection.hostname.endsWith(".neon.tech")) {
    connection.hostname = connection.hostname.replace("-pooler.", ".");
    connection.searchParams.set("sslmode", "verify-full");
}

const pool = new Pool({ connectionString: connection.toString(), max: 1, connectionTimeoutMillis: 8000 });
try {
    const db = await pool.connect();
    try {
        await db.query(`SET search_path TO "${schema}"`);
        const { rows: [check] } = await db.query(`SELECT current_schema()=$1 AS "schemaMatches",
            to_regclass('oc_client_sales') IS NOT NULL AS "prerequisites"`, [schema]);
        if (!check.schemaMatches || !check.prerequisites) throw new Error("Esquema incompleto.");
        await db.query(await readFile(new URL("../sql/clients/030-sale-internal-controls.sql", import.meta.url), "utf8"));
        const { rows: [row] } = await db.query("SELECT to_regclass('oc_client_sale_controls') IS NOT NULL AS applied");
        if (!row.applied) throw new Error("Falta la tabla de controles internos.");
        console.log(`Migración 030 aplicada en ${schema}.`);
    } catch (error) {
        await db.query("ROLLBACK");
        throw error;
    } finally {
        db.release();
    }
} catch (error) {
    const code = typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? ` (${error.code})` : "";
    console.error(`No se pudo preparar el esquema ${schema}${code}.`);
    process.exitCode = 1;
} finally {
    await pool.end();
}
