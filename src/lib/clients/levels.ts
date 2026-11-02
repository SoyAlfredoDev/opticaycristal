import "server-only";
import { randomUUID } from "node:crypto";
import { clientPool, clientTable as t } from "./db";
import type { LevelBenefits, LevelChange, LevelSettings, ManagedLevel } from "./level-types";

export class LevelError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const codes = ["start", "vip", "premium", "elite"];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const pageSize = 20;
type Row = Record<string, unknown>;
function levelCode(value: unknown) {
  if (typeof value !== "string" || !codes.includes(value)) throw new LevelError("Selecciona un nivel válido.");
  return value;
}
function integer(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new LevelError(`${name}: ingresa un entero entre ${min} y ${max}.`);
  return value;
}
function benefits(row: Row): LevelBenefits {
  return { maxPercent: Number(row.max_percent), maxAmount: Number(row.max_amount), maxInstallments: Number(row.max_installments) };
}
function same(a: LevelBenefits, b: LevelBenefits) {
  return a.maxPercent === b.maxPercent && a.maxAmount === b.maxAmount && a.maxInstallments === b.maxInstallments;
}
function position(cursor: string | null): [string | null, string | null] {
  if (cursor === null) return [null, null];
  try {
    if (cursor.length > 300 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "string" || value[0].length > 60 || !Number.isFinite(Date.parse(value[0])) || typeof value[1] !== "string" || !uuid.test(value[1])) throw new Error();
    return [value[0], value[1]];
  } catch { throw new LevelError("Página de historial no válida."); }
}
export async function getLevelSettings(filter: string | null = null, cursor: string | null = null): Promise<LevelSettings> {
  const code = filter === null ? null : levelCode(filter);
  const [date, id] = position(cursor);
  const [levels, history] = await Promise.all([
    clientPool().query(`SELECT code,name,max_percent,max_amount,max_installments,revision FROM ${t("oc_client_tiers")} ORDER BY position`),
    clientPool().query(`SELECT *,created_at::text AS cursor_date FROM ${t("oc_client_level_changes")}
      WHERE ($1::text IS NULL OR level_code=$1) AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid))
      ORDER BY created_at DESC,id DESC LIMIT 21`, [code, date, id]),
  ]);
  const rows: Row[] = history.rows;
  const last = rows[pageSize - 1];
  return {
    levels: levels.rows.map((r: Row): ManagedLevel => ({ code: String(r.code), name: String(r.name), ...benefits(r), revision: Number(r.revision) })),
    history: rows.slice(0, pageSize).map((r): LevelChange => ({ id: String(r.id), code: String(r.level_code), name: String(r.level_name), before: r.before_values as LevelBenefits, after: r.after_values as LevelBenefits, actor: String(r.actor), reason: String(r.reason), revision: Number(r.revision), createdAt: new Date(String(r.created_at)).toISOString() })),
    nextCursor: rows.length > pageSize ? Buffer.from(JSON.stringify([last.cursor_date, last.id])).toString("base64url") : null,
  };
}
export async function updateLevelBenefits(raw: unknown, actor: string) {
  if (!actor.trim()) throw new LevelError("Acceso restringido.", 403);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new LevelError("Datos no válidos.");
  const input = raw as Row;
  const code = levelCode(input.code);
  const expected = integer(input.expectedRevision, "Versión", 1, 2_147_483_646);
  const next: LevelBenefits = {
    maxPercent: integer(input.maxPercent, "Porcentaje financiable", 1, 99),
    maxAmount: integer(input.maxAmount, "Cupo máximo", 1, 1_000_000_000),
    maxInstallments: integer(input.maxInstallments, "Cuotas", 1, 4),
  };
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 5 || reason.length > 500) throw new LevelError("Escribe un motivo de entre 5 y 500 caracteres.");
  const key = input.requestKey;
  if (typeof key !== "string" || !uuid.test(key)) throw new LevelError("Identificador de envío no válido.");
  const db = await clientPool().connect();
  let replayed = false;
  try {
    await db.query("BEGIN");
    // Serializes retries even if the same request key is sent for another level.
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const current = (await db.query(`SELECT code,name,max_percent,max_amount,max_installments,revision FROM ${t("oc_client_tiers")} WHERE code=$1 FOR UPDATE`, [code])).rows[0];
    if (!current) throw new LevelError("Nivel no encontrado.", 404);
    const previous = (await db.query(`SELECT level_code,actor,reason,revision,after_values FROM ${t("oc_client_level_changes")} WHERE request_key=$1`, [key])).rows[0];
    if (previous) {
      if (previous.level_code !== code || previous.actor !== actor || previous.reason !== reason || Number(previous.revision) !== expected + 1 || !same(previous.after_values, next)) throw new LevelError("Este envío ya se utilizó para otro cambio.", 409);
      replayed = true;
    } else {
      if (Number(current.revision) !== expected) throw new LevelError("Este nivel cambió mientras editabas. Revisa los valores actuales antes de guardar.", 409);
      const before = benefits(current);
      if (same(before, next)) throw new LevelError("Modifica al menos un beneficio antes de guardar.");
      await db.query(`UPDATE ${t("oc_client_tiers")} SET max_percent=$2,max_amount=$3,max_installments=$4,revision=revision+1 WHERE code=$1`, [code, next.maxPercent, next.maxAmount, next.maxInstallments]);
      await db.query(`INSERT INTO ${t("oc_client_level_changes")}(id,level_code,level_name,before_values,after_values,actor,reason,revision,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [randomUUID(), code, current.name, JSON.stringify(before), JSON.stringify(next), actor, reason, expected + 1, key]);
    }
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
  return { replayed };
}
