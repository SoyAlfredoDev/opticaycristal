// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PDFDocument, PDFName } from "pdf-lib";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Pool } from "pg";
const auth = vi.hoisted(() => ({ role: "administrator" as string | null, actor: "staff-a" }));
vi.mock("./db", () => ({ clientPool: () => pool, clientTable: (name: string) => name }));
vi.mock("./admin", () => ({ customerAdminSession: async () => auth.role ? { u: auth.actor, role: auth.role } : null }));
import { GET, POST } from "@/app/api/admin/clientes/ventas/[id]/compromiso/archivo/route";
import { readCommitmentUpload, readSaleCommitment, uploadSaleCommitment } from "./commitment-uploads";
import { protectClientValue, revealClientValue } from "./privacy";
import { listAdminSales } from "./sales-register";
import { COMMITMENT_UPLOAD_BYTES } from "./commitment-upload-types";
const db = new PGlite();
const connection = { query: async (sql: string, values?: unknown[]) => { const r = await db.query(sql, values); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; }, release() {} };
const pool = { query: connection.query, connect: async () => connection } as unknown as Pool;
const origin = "http://localhost:3034", scope = { actor: "staff-a", seller: false };
let pdf: Buffer, png: Buffer;
const ids = { credit: randomUUID(), cash: randomUUID(), cancelled: randomUUID(), other: randomUUID(), photos: randomUUID(), signed: randomUUID(), limited: randomUUID(), corrupt: randomUUID(), duplicate: randomUUID() };
const ctx = (id: string = ids.credit) => ({ params: Promise.resolve({ id }) });
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const input = (bytes = pdf, type = "application/pdf") => ({ requestKey: randomUUID(), files: [{ bytes, type }] });
function request(files = [new File([new Uint8Array(pdf)], "compromiso.pdf", { type: "application/pdf" })], requestOrigin = origin, key = randomUUID()) {
  const body = new FormData(); body.append("requestKey", key); files.forEach(file => body.append("files", file));
  return new Request(origin + "/api/admin/clientes/ventas/id/compromiso/archivo", { method: "POST", headers: { Origin: requestOrigin }, body });
}
async function uploaded(id: string) { return (await db.query("SELECT * FROM oc_client_sale_commitment_uploads WHERE sale_id=$1", [id])).rows[0] as Record<string, string>; }
beforeAll(async () => {
  vi.stubEnv("CLIENT_APP_URL", origin); vi.stubEnv("CLIENT_DATA_KEY", randomBytes(32).toString("base64"));
  for (const file of ["001-customers", "002-sales", "003-audit", "010-payment-commitments", "019-agreement-models", "030-sale-internal-controls", "031-automatic-sale-controls", "032-sale-commitment-uploads", "032-sale-commitment-uploads"])
    await db.exec(await readFile(`sql/clients/${file}.sql`, "utf8"));
  await db.query("INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('product','Lente ejemplo',10000,'staff-a')");
  for (const [name, id] of Object.entries(ids)) {
    await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES($1,'Cliente Ejemplo',$2,'Cliente','Ejemplo','encrypted',$1,'encrypted')`, [id, name + "@example.invalid"]);
    const cash = name === "cash";
    await db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by,status)
      VALUES($1,$1,$1,'{}','product','Lente ejemplo',1,10000,100000,84034,15966,$2,$3,$3,'start',30,40000,$4,true,'qa',$5,$6)`, [id, cash ? 100000 : 60000, cash ? 0 : 40000, cash ? 0 : 1, name === "other" ? "staff-b" : "staff-a", name === "cancelled" ? "cancelled" : "active"]);
  }
  const document = await PDFDocument.create(); document.addPage(); document.addPage(); pdf = Buffer.from(await document.save());
  png = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#fff" } }).png().toBuffer();
}, 30000);
beforeEach(() => { auth.role = "administrator"; auth.actor = "staff-a"; });
afterAll(async () => { await db.close(); vi.unstubAllEnvs(); });
it("requiere sesión de personal, mismo origen y propiedad para vendedores", async () => {
  auth.role = null; expect((await POST(request(), ctx())).status).toBe(401); expect((await GET(request(), ctx())).status).toBe(401);
  auth.role = "seller"; expect((await POST(request(undefined, "https://external.invalid"), ctx())).status).toBe(403);
  expect((await POST(request(), ctx(ids.other))).status).toBe(404); expect((await GET(request(), ctx(ids.other))).status).toBe(404);
  expect((await GET(request(), ctx("invalid"))).status).toBe(404);
});
it("no solicita compromisos en contado ni permite cargar en ventas anuladas", async () => {
  expect((await POST(request(), ctx(ids.cash))).status).toBe(409);
  expect((await POST(request(), ctx(ids.cancelled))).status).toBe(409);
});
it("guarda un PDF cifrado e inmutable sin modificar venta, firma, saldo ni pagos", async () => {
  const before = (await db.query("SELECT * FROM oc_client_sales WHERE id=$1", [ids.credit])).rows;
  const response = await POST(request(), ctx()); expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ file: { source: "upload", uploadedBy: "staff-a", pages: 2 } });
  const row = await uploaded(ids.credit); expect(row.payload_enc).not.toContain(pdf.toString("base64"));
  expect(Buffer.from(revealClientValue(row.payload_enc, "sale-commitment-upload"), "base64")).toEqual(pdf);
  expect((await db.query("SELECT * FROM oc_client_sales WHERE id=$1", [ids.credit])).rows).toEqual(before);
  expect((await db.query("SELECT * FROM oc_client_agreement_acceptances")).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM oc_client_payments")).rows).toHaveLength(0);
  await expect(db.query("UPDATE oc_client_sale_commitment_uploads SET uploaded_by='other' WHERE sale_id=$1", [ids.credit])).rejects.toThrow(/immutable/);
  await expect(db.query("DELETE FROM oc_client_sale_commitment_uploads WHERE sale_id=$1", [ids.credit])).rejects.toThrow(/immutable/);
});
it("el PDF privado solo se entrega a personal autorizado, sin caché ni URL pública", async () => {
  const response = await GET(request(), ctx()); expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf"); expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("content-security-policy")).toContain("sandbox"); expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
  auth.actor = "staff-b"; auth.role = "seller"; expect((await GET(request(), ctx())).status).toBe(404);
  auth.role = "administrator"; expect((await GET(request(), ctx())).status).toBe(200);
});
it("reintentar no duplica ni reemplaza el documento", async () => {
  const same = input(); expect(await uploadSaleCommitment(ids.credit, scope, same)).toMatchObject({ pages: 2 });
  const otherPdf = await PDFDocument.create(); otherPdf.addPage();
  await expect(uploadSaleCommitment(ids.credit, scope, input(Buffer.from(await otherPdf.save())))).rejects.toMatchObject({ status: 409 });
  expect((await db.query("SELECT * FROM oc_client_sale_commitment_uploads WHERE sale_id=$1", [ids.credit])).rows).toHaveLength(1);
  const first = input(); await uploadSaleCommitment(ids.duplicate, scope, first);
  await expect(uploadSaleCommitment(ids.corrupt, scope, first)).rejects.toMatchObject({ status: 409 });
  expect(await uploaded(ids.corrupt)).toBeUndefined();
});
it("combina las fotos en un único PDF y registra número de hojas y responsable", async () => {
  auth.role = "seller";
  const file = new File([new Uint8Array(png)], "hoja.png", { type: "image/png" });
  const response = await POST(request([file, file]), ctx(ids.photos)); expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ file: { pages: 2, uploadedBy: "staff-a" } });
  expect((await PDFDocument.load(await readSaleCommitment(ids.photos, scope))).getPageCount()).toBe(2);
  const result = await listAdminSales("", 0, null); expect(result.sales.find(s => s.id === ids.photos)?.commitmentFile?.pages).toBe(2);
  expect(JSON.stringify(result)).not.toMatch(/payload_enc|input_hash|content_hash|rutHash|encrypted/);
});
it("rechaza archivos falsos, dañados, elementos activos, mezclas y exceso de hojas", async () => {
  for (const data of [input(Buffer.from("<html>bad</html>")), input(pdf, "image/png"), input(Buffer.from("%PDF-corrupt"))])
    await expect(uploadSaleCommitment(ids.other, scope, data)).rejects.toMatchObject({ status: 400 });
  const active = await PDFDocument.create(); active.addPage(); active.catalog.set(PDFName.of("OpenAction"), active.context.obj({ S: "JavaScript", JS: "alert(1)" }));
  await expect(uploadSaleCommitment(ids.other, scope, input(Buffer.from(await active.save())))).rejects.toThrow(/activos/);
  await expect(uploadSaleCommitment(ids.other, scope, { requestKey: randomUUID(), files: [input().files[0], { bytes: png, type: "image/png" }] })).rejects.toThrow(/sin mezclarlos/);
  const many = await PDFDocument.create(); for (let i = 0; i < 31; i++) many.addPage();
  await expect(uploadSaleCommitment(ids.other, scope, input(Buffer.from(await many.save())))).rejects.toThrow(/30/);
});
it("limita multipart y archivos antes de procesarlos, incluso sin content-length", async () => {
  const huge = new File([new Uint8Array(COMMITMENT_UPLOAD_BYTES + 65537)], "large.pdf", { type: "application/pdf" });
  await expect(readCommitmentUpload(request([huge]))).rejects.toMatchObject({ status: 413 });
  const declared = request(); declared.headers.set("content-length", String(COMMITMENT_UPLOAD_BYTES + 65537));
  await expect(readCommitmentUpload(declared)).rejects.toMatchObject({ status: 413 });
  const bad = new FormData(); bad.append("requestKey", randomUUID()); bad.append("extra", "forbidden");
  await expect(readCommitmentUpload(new Request(origin, { method: "POST", body: bad }))).rejects.toThrow(/válida/);
  await expect(readCommitmentUpload(request(Array.from({ length: 5 }, () => new File([new Uint8Array(png)], "photo.png", { type: "image/png" }))))).rejects.toThrow(/cuatro/);
});
it("reutiliza la copia firmada existente y no la reemplaza por un adjunto", async () => {
  await db.query(`INSERT INTO oc_client_commitments(sale_id,user_id,version,payload_enc,content_hash,prepared_by) VALUES($1,$1,'2026-11-02-compromiso-v3','encrypted',$2,'staff-a')`, [ids.signed, sha(pdf)]);
  await db.query(`INSERT INTO oc_client_agreement_acceptances(sale_id,signed_on,confirmed_by,copy_delivered_on,delivery_method,delivery_reference,original_reference,signed_pdf_enc,signed_pdf_hash,legal_annual_limit,legal_limit_reference)
    VALUES($1,current_date,'staff-a',current_date,'paper','QA copy','QA original',$2,$3,20,'QA reference')`, [ids.signed, protectClientValue(pdf.toString("base64"), "signed-contract"), sha(pdf)]);
  expect((await listAdminSales("", 0, null)).sales.find(s => s.id === ids.signed)?.commitmentFile).toMatchObject({ source: "signed", uploadedBy: "staff-a" });
  expect(await readSaleCommitment(ids.signed, scope)).toEqual(pdf);
  await expect(uploadSaleCommitment(ids.signed, scope, input())).rejects.toMatchObject({ status: 409 });
});
it("limita reintentos y falla de forma cerrada ante documentos alterados", async () => {
  for (let i = 0; i < 6; i++) expect((await POST(request([new File(["bad"], "bad.pdf", { type: "application/pdf" })]), ctx(ids.limited))).status).toBe(400);
  expect((await POST(request(), ctx(ids.limited))).status).toBe(429);
  await uploadSaleCommitment(ids.corrupt, scope, input());
  await db.exec("ALTER TABLE oc_client_sale_commitment_uploads DISABLE TRIGGER oc_client_preserve_commitment_upload");
  await db.query("UPDATE oc_client_sale_commitment_uploads SET content_hash=$2 WHERE sale_id=$1", [ids.corrupt, "0".repeat(64)]);
  await db.exec("ALTER TABLE oc_client_sale_commitment_uploads ENABLE TRIGGER oc_client_preserve_commitment_upload");
  expect((await GET(request(), ctx(ids.corrupt))).status).toBe(503);
});
it("no permite preparar adjuntos sin las tablas documentales que requiere el historial", async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec("CREATE TABLE oc_client_sales(id text PRIMARY KEY)");
    await expect(isolated.exec(await readFile("sql/clients/032-sale-commitment-uploads.sql", "utf8"))).rejects.toThrow(/010 and 019/);
    await isolated.exec("ROLLBACK");
    expect((await isolated.query("SELECT to_regclass('oc_client_sale_commitment_uploads') IS NULL AS absent")).rows).toEqual([{ absent: true }]);
  } finally { await isolated.close(); }
});
