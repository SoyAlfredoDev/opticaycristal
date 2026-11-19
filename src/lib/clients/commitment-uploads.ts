import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream } from "pdf-lib";
import sharp from "sharp";
import { clientPool, clientTable as t } from "./db";
import { protectClientValue, revealClientValue } from "./privacy";
import { signedAgreement } from "./agreement-acceptance";
import { COMMITMENT_UPLOAD_BYTES, COMMITMENT_UPLOAD_FILES, type SaleCommitmentFile } from "./commitment-upload-types";

export class CommitmentUploadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type CommitmentScope = { actor: string; seller: boolean };
type UploadPart = { bytes: Buffer; type: string };
export type CommitmentInput = { requestKey: string; files: UploadPart[] };
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Bound the stream before invoking the multipart parser, including chunked requests.
export async function readCommitmentUpload(request: Request): Promise<CommitmentInput> {
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) throw new CommitmentUploadError("Selecciona un PDF o fotos del documento.");
  const limit = COMMITMENT_UPLOAD_BYTES + 65536;
  if (Number(request.headers.get("content-length") || 0) > limit) throw new CommitmentUploadError("Los archivos no pueden superar 3 MB en total.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CommitmentUploadError("Selecciona el documento.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new CommitmentUploadError("Los archivos no pueden superar 3 MB en total.", 413); }
    chunks.push(value);
  }
  let form: FormData;
  try { form = await new Request("http://upload.local", { method: "POST", headers: { "content-type": contentType }, body: Buffer.concat(chunks) }).formData(); }
  catch { throw new CommitmentUploadError("No pudimos leer los archivos. Vuelve a seleccionarlos."); }
  if ([...form.keys()].some(key => key !== "files" && key !== "requestKey") || form.getAll("requestKey").length !== 1)
    throw new CommitmentUploadError("Solicitud no válida.");
  const requestKey = form.get("requestKey");
  const files = form.getAll("files");
  if (typeof requestKey !== "string" || !uuid.test(requestKey) || files.length < 1 || files.length > COMMITMENT_UPLOAD_FILES || files.some(file => typeof file === "string"))
    throw new CommitmentUploadError("Adjunta un PDF o hasta cuatro fotos.");
  const parts = await Promise.all((files as File[]).map(async file => ({ bytes: Buffer.from(await file.arrayBuffer()), type: file.type })));
  if (parts.some(file => !file.bytes.length) || parts.reduce((sum, file) => sum + file.bytes.length, 0) > COMMITMENT_UPLOAD_BYTES)
    throw new CommitmentUploadError("Los archivos no pueden estar vacíos ni superar 3 MB en total.", 413);
  return { requestKey, files: parts };
}

async function accessibleSale(saleId: string, scope: CommitmentScope, lock = false, db: Pick<PoolClient, "query"> = clientPool()) {
  if (!uuid.test(saleId) || !scope.actor || scope.actor.length > 200) throw new CommitmentUploadError("Venta no encontrada.", 404);
  const { rows: [row] } = await db.query(`SELECT id,credit,status FROM ${t("oc_client_sales")}
    WHERE id=$1 AND ($2::text IS NULL OR created_by=$2)${lock ? " FOR UPDATE" : ""}`, [saleId, scope.seller ? scope.actor : null]);
  if (!row) throw new CommitmentUploadError("Venta no encontrada.", 404);
  return row;
}
export async function checkCommitmentSale(saleId: string, scope: CommitmentScope) { await accessibleSale(saleId, scope); }

function fileKind(part: UploadPart) {
  const b = part.bytes;
  const kind = b.subarray(0, 5).toString() === "%PDF-" ? "application/pdf" :
    b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png" :
      b[0] === 255 && b[1] === 216 && b[2] === 255 ? "image/jpeg" : "";
  if (!kind || (part.type && part.type !== kind)) throw new CommitmentUploadError("Solo se permiten PDF, JPG y PNG válidos.");
  return kind;
}
async function documentBytes(files: UploadPart[]) {
  const kinds = files.map(fileKind);
  try {
    if (kinds.includes("application/pdf")) {
      if (files.length !== 1) throw new CommitmentUploadError("Adjunta un solo PDF o varias fotos, sin mezclarlos.");
      const bytes = files[0].bytes;
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      const pages = pdf.getPageCount();
      if (pages < 1 || pages > 30) throw new CommitmentUploadError("El PDF debe contener entre 1 y 30 páginas.");
      // Preserve the original bytes (including signatures), reject active PDF features.
      const forbidden = new Set(["JS", "JavaScript", "OpenAction", "AA", "Launch", "EmbeddedFiles", "RichMedia", "XFA", "SubmitForm", "ImportData"]);
      let visited = 0;
      function inspect(object: unknown, depth = 0) {
        if (++visited > 100000 || depth > 50) throw new CommitmentUploadError("El PDF es demasiado complejo. Adjunta una copia simple.");
        if (object instanceof PDFStream) inspect(object.dict, depth + 1);
        if (object instanceof PDFDict) for (const [key, value] of object.entries()) {
          if (forbidden.has(key.decodeText())) throw new CommitmentUploadError("El PDF contiene elementos activos. Exporta una copia simple o adjunta fotos.");
          inspect(value, depth + 1);
        }
        if (object instanceof PDFArray) for (const value of object.asArray()) inspect(value, depth + 1);
        if (object instanceof PDFName && forbidden.has(object.decodeText())) throw new CommitmentUploadError("El PDF contiene elementos activos. Exporta una copia simple o adjunta fotos.");
      }
      for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object);
      return { bytes, pages };
    }
    const pdf = await PDFDocument.create();
    for (const file of files) {
      const image = sharp(file.bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || metadata.width < 256 || metadata.height < 256 || (metadata.pages ?? 1) > 1)
        throw new CommitmentUploadError("Usa fotos legibles de al menos 256 × 256 píxeles.");
      const jpeg = await image.rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
      const embedded = await pdf.embedJpg(jpeg), page = pdf.addPage([595.28, 841.89]);
      const scale = Math.min(571.28 / embedded.width, 817.89 / embedded.height);
      const width = embedded.width * scale, height = embedded.height * scale;
      page.drawImage(embedded, { x: (595.28 - width) / 2, y: (841.89 - height) / 2, width, height });
    }
    const bytes = Buffer.from(await pdf.save());
    if (bytes.length > COMMITMENT_UPLOAD_BYTES) throw new CommitmentUploadError("El documento final supera 3 MB. Usa fotos de menor tamaño.", 413);
    return { bytes, pages: pdf.getPageCount() };
  } catch (error) {
    if (error instanceof CommitmentUploadError) throw error;
    throw new CommitmentUploadError("No pudimos leer el documento. Revisa que no esté dañado ni protegido con contraseña.");
  }
}
type StoredUpload = { input_hash: string; uploaded_by: string; uploaded_at: Date | string; pages: number; payload_enc: string; content_hash: string; request_key: string };
function metadata(row: StoredUpload): SaleCommitmentFile {
  return { source: "upload", uploadedBy: row.uploaded_by, uploadedAt: new Date(row.uploaded_at).toISOString(), pages: row.pages };
}
export async function uploadSaleCommitment(saleId: string, scope: CommitmentScope, input: CommitmentInput) {
  if (!uuid.test(input.requestKey) || input.files.length < 1 || input.files.length > COMMITMENT_UPLOAD_FILES || input.files.some(f => !f.bytes.length) || input.files.reduce((n, f) => n + f.bytes.length, 0) > COMMITMENT_UPLOAD_BYTES)
    throw new CommitmentUploadError("Revisa los archivos seleccionados.");
  const sale = await accessibleSale(saleId, scope);
  if (Number(sale.credit) <= 0 || sale.status !== "active") throw new CommitmentUploadError("La carga está disponible para ventas a crédito vigentes.", 409);
  const inputHash = hash(Buffer.from(JSON.stringify(input.files.map(f => [f.type, f.bytes.length, hash(f.bytes)]))));
  const document = await documentBytes(input.files);
  const db = await clientPool().connect();
  try {
    await db.query("BEGIN");
    const locked = await accessibleSale(saleId, scope, true, db);
    if (Number(locked.credit) <= 0 || locked.status !== "active") throw new CommitmentUploadError("La venta ya no permite adjuntar el compromiso.", 409);
    const signed = await db.query(`SELECT sale_id FROM ${t("oc_client_agreement_acceptances")} WHERE sale_id=$1`, [saleId]);
    if (signed.rows.length) throw new CommitmentUploadError("La venta ya tiene una copia firmada disponible.", 409);
    const { rows: [existing] } = await db.query<StoredUpload>(`SELECT * FROM ${t("oc_client_sale_commitment_uploads")} WHERE sale_id=$1`, [saleId]);
    if (existing) {
      if (existing.input_hash !== inputHash || existing.uploaded_by !== scope.actor) throw new CommitmentUploadError("La venta ya tiene un documento cargado. No se ha reemplazado.", 409);
      await db.query("COMMIT"); return metadata(existing);
    }
    const { rows: [row] } = await db.query<StoredUpload>(`INSERT INTO ${t("oc_client_sale_commitment_uploads")}
      (id,sale_id,request_key,input_hash,content_hash,payload_enc,size,pages,source_count,uploaded_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [randomUUID(), saleId, input.requestKey, inputHash, hash(document.bytes), protectClientValue(document.bytes.toString("base64"), "sale-commitment-upload"), document.bytes.length, document.pages, input.files.length, scope.actor]);
    await db.query("COMMIT"); return metadata(row);
  } catch (error) {
    await db.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") throw new CommitmentUploadError("La solicitud ya fue utilizada. Actualiza las ventas antes de reintentar.", 409);
    throw error;
  } finally { db.release(); }
}
export async function readSaleCommitment(saleId: string, scope: CommitmentScope) {
  await accessibleSale(saleId, scope);
  const signed = await signedAgreement(saleId);
  if (signed) return signed.bytes;
  const { rows: [row] } = await clientPool().query<StoredUpload>(`SELECT * FROM ${t("oc_client_sale_commitment_uploads")} WHERE sale_id=$1`, [saleId]);
  if (!row) throw new CommitmentUploadError("El compromiso todavía no está cargado.", 404);
  const bytes = Buffer.from(revealClientValue(row.payload_enc, "sale-commitment-upload"), "base64");
  if (hash(bytes) !== row.content_hash) throw new Error("El documento no supera la verificación de integridad.");
  return bytes;
}
