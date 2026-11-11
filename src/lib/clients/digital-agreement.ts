import "server-only";
import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "./db";
import { clientFingerprint, protectClientValue, revealClientValue } from "./privacy";
import { getStoredCommitment } from "./commitments";
import { sendAgreementMail } from "./mail";
import { DIGITAL_ACCEPTANCE_CLAUSE, DIGITAL_AGREEMENT_TERMS } from "./digital-agreement-copy";

const date = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const termsHash = digest(Buffer.from(DIGITAL_AGREEMENT_TERMS));
const hashEmail = (email: string) => clientFingerprint(email, "agreement-email");
const hashCode = (code: string, request: string, owner: string, hash: string, email: string) =>
  clientFingerprint(code, `agreement-sign:${request}:${owner}:${hash}:${hashEmail(email)}`);

export class DigitalAgreementError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export function canAuthorizeDigitalAgreement(staffId?: string) {
  return Boolean(staffId && staffId === process.env.CLIENT_DIGITAL_AGREEMENT_REPRESENTATIVE_ID && process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH);
}

async function transaction<T>(run: (db: PoolClient) => Promise<T>) {
  const db = await clientPool().connect();
  try {
    await db.query("BEGIN");
    const result = await run(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { db.release(); }
}

async function lockSale(db: PoolClient, saleId: string, userId?: string) {
  const saleOwner = (await db.query(`SELECT user_id FROM ${t("oc_client_sales")} WHERE id=$1 AND ($2::text IS NULL OR user_id=$2)`, [saleId, userId ?? null])).rows[0];
  if (!saleOwner) throw new DigitalAgreementError("Venta no encontrada.", 404);
  const user = (await db.query(`SELECT id,email,"emailVerified" FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`, [saleOwner.user_id])).rows[0];
  const sale = (await db.query(`SELECT * FROM ${t("oc_client_sales")} WHERE id=$1 FOR UPDATE`, [saleId])).rows[0];
  if (!user?.emailVerified || sale?.status !== "active" || !sale.identity_checked || Number(sale.credit) <= 0)
    throw new DigitalAgreementError("La venta requiere identidad revisada y correo verificado.");
  return { user, sale };
}

export async function authorizeDigitalAgreement(saleId: string, staffId: string, raw: Record<string, unknown>) {
  if (!canAuthorizeDigitalAgreement(staffId)) throw new DigitalAgreementError("Acceso no autorizado.", 403);
  const limit = raw.limit;
  const reference = typeof raw.reference === "string" ? raw.reference.trim() : "";
  if (raw.accepted !== true || typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0 || limit > 100 || reference.length < 3 || reference.length > 500)
    throw new DigitalAgreementError("Confirma la firma y registra el límite anual vigente y su fuente.", 400);
  await transaction(async db => {
    const { user, sale } = await lockSale(db, saleId);
    const doc = await getStoredCommitment(saleId, user.id, db);
    if (sale.signed_at || !doc?.model || doc.model.hash !== process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH ||
      doc.model.definition.clauses.acceptance !== DIGITAL_ACCEPTANCE_CLAUSE ||
      doc.representative.rut.replace(/[^0-9k]/gi, "").toUpperCase() !== process.env.CLIENT_DIGITAL_AGREEMENT_REPRESENTATIVE_RUT?.replace(/[^0-9k]/gi, "").toUpperCase())
      throw new DigitalAgreementError("La venta necesita un modelo habilitado para firma digital y un representante autorizado.");
    const issued = (await db.query(`SELECT pdf_hash FROM ${t("oc_client_commitments")} WHERE sale_id=$1`, [saleId])).rows[0];
    if (!issued?.pdf_hash) throw new DigitalAgreementError("Falta el PDF original.");
    await db.query(`INSERT INTO ${t("oc_client_agreement_digital")} (sale_id,pdf_hash,representative_id,legal_limit,legal_reference,terms_hash)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (sale_id) DO UPDATE SET representative_id=EXCLUDED.representative_id, approved_at=now(),
      terms_hash=EXCLUDED.terms_hash,legal_limit=EXCLUDED.legal_limit,legal_reference=EXCLUDED.legal_reference,request_id=NULL,code_hash=NULL,email_hash=NULL,expires_at=NULL
      WHERE oc_client_agreement_digital.signed_at IS NULL`, [saleId, issued.pdf_hash, staffId, limit, reference, termsHash]);
  });
}

export async function digitalAgreementStatus(saleId: string, userId: string) {
  if (!process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH) return null;
  const row = (await clientPool().query(`SELECT d.signed_at,d.mail_accepted_at,d.approved_at FROM ${t("oc_client_agreement_digital")} d
    JOIN ${t("oc_client_sales")} s ON s.id=d.sale_id WHERE s.id=$1 AND s.user_id=$2`, [saleId, userId])).rows[0];
  return row ? { signed: Boolean(row.signed_at), sent: Boolean(row.mail_accepted_at), available: date(row.approved_at) === date(new Date()) } : null;
}

async function ready(db: PoolClient, saleId: string, userId: string) {
  const { user, sale } = await lockSale(db, saleId, userId);
  const row = (await db.query(`SELECT *,resend_at>now() AS waiting, expires_at<=now() AS expired FROM ${t("oc_client_agreement_digital")} WHERE sale_id=$1 FOR UPDATE`, [saleId])).rows[0];
  if (row?.signed_at) return { user, row };
  const doc = await getStoredCommitment(saleId, userId, db);
  if (sale.signed_at || !row || !doc?.model || doc.model.hash !== process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH ||
      doc.model.definition.clauses.acceptance !== DIGITAL_ACCEPTANCE_CLAUSE ||
      row.terms_hash !== termsHash || row.representative_id !== process.env.CLIENT_DIGITAL_AGREEMENT_REPRESENTATIVE_ID ||
      date(row.approved_at) !== date(new Date()))
    throw new DigitalAgreementError("Pide al ejecutivo que habilite la firma de esta compra.");
  return { user, row };
}

export async function requestAgreementCode(saleId: string, userId: string) {
  const requestId = randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  const email = await transaction(async db => {
    const { user, row } = await ready(db, saleId, userId);
    if (row.signed_at) throw new DigitalAgreementError("El compromiso ya está firmado.");
    if (row.waiting) throw new DigitalAgreementError("Espera un minuto antes de reenviar.", 429);
    const key = clientFingerprint(userId, "agreement-mail-limit");
    const limit = (await db.query(`INSERT INTO ${t("oc_client_registration_limit")} AS l (key,count,reset_at)
      VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN l.reset_at<=now() THEN 1 ELSE l.count+1 END,
      reset_at=CASE WHEN l.reset_at<=now() THEN now()+interval '1 hour' ELSE l.reset_at END RETURNING count`, [key])).rows[0];
    if (Number(limit.count) > 5) throw new DigitalAgreementError("Alcanzaste el límite de envíos. Intenta más tarde.", 429);
    await db.query(`UPDATE ${t("oc_client_agreement_digital")} SET request_id=$2,email_hash=$3,code_hash=$4,attempts=0,
      expires_at=now()+interval '10 minutes',resend_at=now()+interval '1 minute' WHERE sale_id=$1`,
    [saleId, requestId, hashEmail(user.email), hashCode(code, requestId, userId, row.pdf_hash, user.email)]);
    return user.email as string;
  });
  if (!await sendAgreementMail(email, saleId, requestId, code)) {
    await clientPool().query(`UPDATE ${t("oc_client_agreement_digital")} SET code_hash=NULL WHERE sale_id=$1 AND request_id=$2`, [saleId, requestId]);
    throw new DigitalAgreementError("No pudimos enviar el código. Intenta en un minuto.", 503);
  }
  return { requestId };
}

export async function signDigitalAgreement(saleId: string, userId: string, raw: Record<string, unknown>) {
  const { code, requestId } = raw;
  if (raw.accepted !== true || typeof code !== "string" || !/^\d{6}$/.test(code) || typeof requestId !== "string")
    throw new DigitalAgreementError("Ingresa los seis dígitos y confirma que aceptas el compromiso.", 400);
  const signed = await transaction(async db => {
    const { user, row } = await ready(db, saleId, userId);
    if (row.signed_at) return true;
    if (row.request_id !== requestId || row.expired || row.attempts >= 5 || !row.code_hash || row.email_hash !== hashEmail(user.email))
      throw new DigitalAgreementError("El código ya no está disponible. Solicita otro.");
    const candidate = hashCode(code, requestId, userId, row.pdf_hash, user.email);
    if (!timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(row.code_hash, "hex"))) {
      await db.query(`UPDATE ${t("oc_client_agreement_digital")} SET attempts=attempts+1 WHERE sale_id=$1`, [saleId]);
      return false;
    }
    const issued = (await db.query(`SELECT pdf_enc,pdf_hash FROM ${t("oc_client_commitments")} WHERE sale_id=$1 AND user_id=$2`, [saleId, userId])).rows[0];
    const original = Buffer.from(revealClientValue(issued.pdf_enc, "contract-document"), "base64");
    if (digest(original) !== row.pdf_hash || issued.pdf_hash !== row.pdf_hash) throw new Error("PDF integrity");
    const now = new Date();
    const pdf = await PDFDocument.load(original);
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("Constancia de firma electrónica", { x: 48, y: 782, size: 19, font });
    page.drawText([
      DIGITAL_AGREEMENT_TERMS, "",
      "Cliente identificado en el contrato",
      `Aceptación con código: ${now.toISOString()}`,
      "Representante identificado en el contrato",
      `Aceptación en administración: ${new Date(row.approved_at).toISOString()}`, "",
      `Venta: ${saleId}`, "SHA-256 del PDF original:", row.pdf_hash,
    ].join("\n"), { x: 48, y: 741, size: 10, lineHeight: 17, maxWidth: 499, font, wordBreaks: [" "] });
    const bytes = Buffer.from(await pdf.save());
    await db.query(`INSERT INTO ${t("oc_client_agreement_acceptances")}
      (sale_id,signed_on,confirmed_at,confirmed_by,copy_delivered_on,delivery_method,delivery_reference,original_reference,signed_pdf_enc,signed_pdf_hash,legal_annual_limit,legal_limit_reference)
      VALUES($1,$2,$3,$4,$2,'portal','Copia íntegra disponible en Mi cuenta',$5,$6,$7,$8,$9)`,
    [saleId, date(now), now, row.representative_id, row.pdf_hash, protectClientValue(bytes.toString("base64"), "signed-contract"), digest(bytes), row.legal_limit, row.legal_reference]);
    await db.query(`UPDATE ${t("oc_client_sales")} SET signed_at=$2,signed_by=$3 WHERE id=$1`, [saleId, now, userId]);
    await db.query(`UPDATE ${t("oc_client_agreement_digital")} SET signed_at=$2,code_hash=NULL WHERE sale_id=$1`, [saleId, now]);
    return true;
  });
  if (!signed) throw new DigitalAgreementError("El código es incorrecto.", 400);
  return sendDigitalAgreementCopy(saleId, userId).catch(() => ({ signed: true, sent: false }));
}

export async function sendDigitalAgreementCopy(saleId: string, userId: string) {
  const row = (await clientPool().query(`SELECT d.mail_accepted_at,d.email_hash,u.email,u."emailVerified" FROM ${t("oc_client_agreement_digital")} d
    JOIN ${t("oc_client_sales")} s ON s.id=d.sale_id JOIN ${t("oc_client_user")} u ON u.id=s.user_id
    WHERE s.id=$1 AND s.user_id=$2 AND d.signed_at IS NOT NULL`, [saleId, userId])).rows[0];
  if (!row) throw new DigitalAgreementError("No hay un compromiso firmado.", 404);
  if (row.mail_accepted_at) return { signed: true, sent: true };
  if (!row.emailVerified || row.email_hash !== hashEmail(row.email)) return { signed: true, sent: false };
  try {
    const claim = await clientPool().query(`UPDATE ${t("oc_client_agreement_digital")}
      SET copy_retry_at=now()+interval '1 minute' WHERE sale_id=$1 AND mail_accepted_at IS NULL
      AND (copy_retry_at IS NULL OR copy_retry_at<=now()) RETURNING sale_id`, [saleId]);
    if (!claim.rows.length) return { signed: true, sent: false };
    const sent = await sendAgreementMail(row.email, saleId, saleId);
    if (sent) await clientPool().query(`UPDATE ${t("oc_client_agreement_digital")} SET mail_accepted_at=now() WHERE sale_id=$1`, [saleId]);
    return { signed: true, sent };
  } catch { return { signed: true, sent: false }; }
}

export async function listDigitalAgreementStatuses(userId: string) {
  if (!process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH) return [];
  const result = await clientPool().query<{sale_id:string; signed_at:Date|null; mail_accepted_at:Date|null}>(`SELECT d.sale_id,d.signed_at,d.mail_accepted_at
    FROM ${t("oc_client_agreement_digital")} d JOIN ${t("oc_client_sales")} s ON s.id=d.sale_id WHERE s.user_id=$1 AND s.status='active'`, [userId]);
  return result.rows;
}
