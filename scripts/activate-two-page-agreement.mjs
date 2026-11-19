import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { PDFDocument } from "pdf-lib";

const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object"
  ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}` : JSON.stringify(value);
const hash = value => createHash("sha256").update(value).digest("hex");

/** A layout approval must never approve a change to any contractual wording. */
export function assertLayoutOnlyRevision(previous, next) {
  if (previous.identifier !== "OC-CD-DIGITAL" || next.identifier !== previous.identifier || next.version !== previous.version + 1 || next.layout !== "a4-two-page-v4")
    throw new Error("La revisión no es la siguiente versión de presentación del modelo digital.");
  const content = value => { const rest = { ...value }; delete rest.version; delete rest.layout; return rest; };
  if (canonical(content(previous)) !== canonical(content(next))) throw new Error("Las cláusulas o condiciones cambiaron. Esta herramienta solo admite cambios de presentación.");
}

export async function activateLayoutRevision(db, { predecessorHash, manifest, sample, actor, apply = false }) {
  if (!/^[a-f0-9]{64}$/.test(predecessorHash) || !actor || actor.length > 200) throw new Error("Indica modelo anterior y responsable.");
  if (hash(canonical(manifest.definition)) !== manifest.hash) throw new Error("La huella del modelo no coincide.");
  const pdf = await PDFDocument.load(sample);
  if (pdf.getPageCount() !== 2 || !pdf.getSubject()?.includes(`/ ${manifest.hash} / a4-two-page-v4`)) throw new Error("La muestra no corresponde al modelo íntegro de dos páginas.");
  await db.query("BEGIN");
  try {
    const { rows: [previous] } = await db.query("SELECT * FROM oc_client_agreement_models WHERE content_hash=$1 AND status='approved' FOR SHARE", [predecessorHash]);
    if (!previous || hash(canonical(previous.definition)) !== predecessorHash) throw new Error("No está disponible el modelo anterior aprobado.");
    assertLayoutOnlyRevision(previous.definition, manifest.definition);
    const { rows: [existing] } = await db.query("SELECT id,status,content_hash FROM oc_client_agreement_models WHERE identifier=$1 AND version=$2", [manifest.definition.identifier, manifest.definition.version]);
    if (existing) {
      if (existing.status !== "approved" || existing.content_hash !== manifest.hash) throw new Error("La versión ya existe con otro contenido o estado. Revisa el registro de modelos.");
      await db.query("COMMIT"); return { id: existing.id, hash: manifest.hash, alreadyApproved: true };
    }
    if (!apply) { await db.query("ROLLBACK"); return { hash: manifest.hash, layoutOnly: true, pages: 2, dryRun: true }; }
    const id = randomUUID();
    const note = "Presentación de máximo dos hojas con letra 10,5 pt autorizada por el titular. Cláusulas y condiciones idénticas al modelo anterior aprobado; sin nuevas condiciones legales. Muestra y firma electrónica revisadas en dos páginas.";
    await db.query(`INSERT INTO oc_client_agreement_models(id,identifier,version,definition,content_hash,sample_pdf,sample_hash,created_by,change_note)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, manifest.definition.identifier, manifest.definition.version, JSON.stringify(manifest.definition), manifest.hash, sample, hash(sample), actor, note]);
    await db.query("INSERT INTO oc_client_agreement_model_events(model_id,to_status,actor,note) VALUES($1,'draft',$2,$3)", [id, actor, note]);
    for (const [from, to] of [["draft", "pending"], ["pending", "approved"]]) {
      await db.query("UPDATE oc_client_agreement_models SET status=$2,approved_by=CASE WHEN $2='approved' THEN $3 ELSE approved_by END,approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END WHERE id=$1", [id, to, actor]);
      await db.query("INSERT INTO oc_client_agreement_model_events(model_id,from_status,to_status,actor,note) VALUES($1,$2,$3,$4,$5)", [id, from, to, actor, note]);
    }
    await db.query("COMMIT"); return { id, hash: manifest.hash, pages: 2, layoutOnly: true };
  } catch (error) { await db.query("ROLLBACK"); throw error; }
}

async function main() {
  const [schema, predecessorHash, manifestPath, samplePath, actor, mode] = process.argv.slice(2);
  if (!schema || schema === "public" || !/^[a-z][a-z0-9_]{0,62}$/.test(schema) || schema !== process.env.CLIENT_DATABASE_SCHEMA || (mode && mode !== "--apply"))
    throw new Error("Indica el esquema explícito, modelo anterior, manifiesto, muestra, responsable y opcionalmente --apply.");
  const source = process.env.CLIENT_DATABASE_URL_UNPOOLED || process.env.CLIENT_DATABASE_URL || process.env.DATABASE_URL;
  if (!source) throw new Error("Falta la conexión existente de clientes.");
  const url = new URL(source);
  if (url.hostname.endsWith(".neon.tech")) { url.hostname = url.hostname.replace("-pooler.", "."); url.searchParams.set("sslmode", "verify-full"); }
  const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 10000 });
  try {
    const db = await pool.connect();
    try {
      await db.query(`SET search_path TO "${schema}"`);
      if ((await db.query("SELECT current_schema()=$1 AS ok", [schema])).rows[0]?.ok !== true) throw new Error("El esquema no coincide.");
      console.log(JSON.stringify(await activateLayoutRevision(db, { predecessorHash, manifest: JSON.parse(await readFile(manifestPath, "utf8")), sample: await readFile(samplePath), actor, apply: mode === "--apply" })));
    } finally { db.release(); }
  } finally { await pool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.code ? `No se pudo activar el modelo (${error.code}).` : error.message); process.exitCode = 1; });
