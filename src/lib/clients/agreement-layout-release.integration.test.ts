// @vitest-environment node
import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PDFDocument } from "pdf-lib";
import { activateLayoutRevision, assertLayoutOnlyRevision } from "../../../scripts/activate-two-page-agreement.mjs";
import { DIGITAL_AGREEMENT_PROPOSAL, TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL } from "./agreement-model";
import { modelHash, specimen } from "./agreement-registry";
import { creditAgreementPdf } from "./credit-agreement-pdf";

it("solo permite cambiar la presentación, sin aprobar nuevas condiciones", () => {
  expect(() => assertLayoutOnlyRevision(DIGITAL_AGREEMENT_PROPOSAL, TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL)).not.toThrow();
  const changed = structuredClone(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL);
  changed.clauses.monthly += " Otra condición.";
  expect(() => assertLayoutOnlyRevision(DIGITAL_AGREEMENT_PROPOSAL, changed)).toThrow(/cláusulas/);
  changed.clauses = structuredClone(DIGITAL_AGREEMENT_PROPOSAL.clauses);
  changed.version = 9;
  expect(() => assertLayoutOnlyRevision(DIGITAL_AGREEMENT_PROPOSAL, changed)).toThrow(/siguiente versión/);
});

it("activa solo la revisión autorizada, conserva su predecesor y registra la aprobación sin duplicarla", async () => {
  const db = new PGlite();
  try {
    for (const name of ["001-customers", "002-sales", "007-installments", "010-payment-commitments", "019-agreement-models"])
      await db.exec(await readFile(`sql/clients/${name}.sql`, "utf8"));
    const previousHash = modelHash(DIGITAL_AGREEMENT_PROPOSAL);
    await db.query(`INSERT INTO oc_client_agreement_models(id,identifier,version,definition,content_hash,sample_pdf,sample_hash,created_by,change_note)
      VALUES('previous','OC-CD-DIGITAL',1,$1,$2,$3,$4,'qa-owner','Modelo anterior de prueba')`, [JSON.stringify(DIGITAL_AGREEMENT_PROPOSAL), previousHash, Buffer.from("previous-original"), "0".repeat(64)]);
    await db.exec("UPDATE oc_client_agreement_models SET status='pending' WHERE id='previous'; UPDATE oc_client_agreement_models SET status='approved',approved_by='qa-owner',approved_at=now() WHERE id='previous'");
    const original = (await db.query("SELECT * FROM oc_client_agreement_models WHERE id='previous'")).rows[0];
    const manifest = { definition: TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL, hash: modelHash(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL) };
    const sample = Buffer.from(await creditAgreementPdf(specimen(manifest.definition)));
    const input = { predecessorHash: previousHash, manifest, sample, actor: "qa-layout-operator" };
    expect(await activateLayoutRevision(db, input)).toMatchObject({ dryRun: true, pages: 2 });
    expect((await db.query("SELECT COUNT(*)::int AS n FROM oc_client_agreement_models")).rows[0]).toEqual({ n: 1 });
    const created = await activateLayoutRevision(db, { ...input, apply: true });
    expect(created).toMatchObject({ hash: manifest.hash, layoutOnly: true });
    expect(await activateLayoutRevision(db, { ...input, apply: true })).toMatchObject({ id: created.id, alreadyApproved: true });
    expect((await db.query("SELECT * FROM oc_client_agreement_models WHERE id='previous'")).rows[0]).toEqual(original);
    expect((await db.query<{ to_status: string }>("SELECT to_status FROM oc_client_agreement_model_events WHERE model_id=$1 ORDER BY id", [created.id])).rows.map(row => row.to_status)).toEqual(["draft", "pending", "approved"]);
    await expect(activateLayoutRevision(db, { ...input, manifest: { ...manifest, hash: "0".repeat(64) }, apply: true })).rejects.toThrow(/huella/);
    const invalid = await PDFDocument.create(); invalid.addPage();
    await expect(activateLayoutRevision(db, { ...input, sample: Buffer.from(await invalid.save()) })).rejects.toThrow(/dos páginas/);
  } finally { await db.close(); }
}, 30000);
