// @vitest-environment node
import { expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { creditAgreementPdf } from "./credit-agreement-pdf";
import { addTwoPageDigitalEvidence, TWO_PAGE_BODY_PT, TwoPageAgreementError } from "./credit-agreement-two-page-pdf";
import { DIGITAL_AGREEMENT_PROPOSAL, FORMAL_AGREEMENT_PROPOSAL, TWO_PAGE_AGREEMENT_PROPOSAL, TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL, validateAgreementModel } from "./agreement-model";
import { modelHash, specimen } from "./agreement-registry";
import { monthlyInstallments } from "./financing";

function example(installments = 4) {
  const document = specimen(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL);
  document.preparedAt = "2026-11-18T15:00:00.000Z";
  document.customer = { name: "Camila Andrea Ejemplo de Prueba", rut: "123456785", email: "camila@example.invalid", whatsapp: "+56911112222" };
  document.representative = { name: "Representante Legal de Demostración", rut: "123456785", signature: "", authority: "Escritura de ejemplo, registro ficticio de facultades, solo para revisión visual." };
  document.sale = { ...document.sale, id: "00000000-0000-4000-8000-000000000001", productName: "Lentes ópticos con armazón y cristales antirreflejo", total: 500000, net: 420168, vat: 79832, deposit: 350000, credit: 150000 };
  document.installments = monthlyInstallments(150000, installments, "2030-01-30");
  return document;
}

it("conserva las cláusulas y las versiones anteriores al crear el modelo de dos páginas", () => {
  expect(TWO_PAGE_AGREEMENT_PROPOSAL.clauses).toEqual(FORMAL_AGREEMENT_PROPOSAL.clauses);
  expect(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL.clauses).toEqual(DIGITAL_AGREEMENT_PROPOSAL.clauses);
  expect(DIGITAL_AGREEMENT_PROPOSAL).toMatchObject({ version: 1, layout: "a4-formal-v3" });
  expect(validateAgreementModel(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL)).toMatchObject({ version: 2, layout: "a4-two-page-v4" });
  expect(modelHash(TWO_PAGE_DIGITAL_AGREEMENT_PROPOSAL)).not.toBe(modelHash(DIGITAL_AGREEMENT_PROPOSAL));
  expect(TWO_PAGE_BODY_PT).toBe(13);
});

it.each([1, 2, 3, 4])("emite exactamente dos páginas A4 con %i cuotas sin alterar la ficha", async count => {
  const document = example(count), snapshot = JSON.stringify(document);
  const bytes = await creditAgreementPdf(document), pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  for (const page of pdf.getPages()) expect(page.getSize()).toEqual({ width: 595.28, height: 841.89 });
  expect(JSON.stringify(document)).toBe(snapshot);
  if (process.env.TWO_PAGE_PDF_QA_OUTPUT && count === 4) {
    await mkdir(process.env.TWO_PAGE_PDF_QA_OUTPUT, { recursive: true });
    await writeFile(`${process.env.TWO_PAGE_PDF_QA_OUTPUT}/compromiso-dos-paginas-ejemplo.pdf`, bytes);
    await writeFile(`${process.env.TWO_PAGE_PDF_QA_OUTPUT}/compromiso-dos-paginas-clausulas-qa.json`, JSON.stringify(document.model!.definition.clauses));
  }
});

it("integra la constancia electrónica en la segunda página sin cambiar el original", async () => {
  const original = await creditAgreementPdf(example()), snapshot = Buffer.from(original);
  const pdf = await PDFDocument.load(original);
  await addTwoPageDigitalEvidence(pdf, {
    saleId: example().sale.id, originalHash: createHash("sha256").update(original).digest("hex"),
    signedAt: new Date("2026-11-18T16:02:00.000Z"), representativeAt: new Date("2026-11-18T16:00:00.000Z"),
  });
  const signed = await pdf.save();
  expect((await PDFDocument.load(signed)).getPageCount()).toBe(2);
  expect(Buffer.from(original)).toEqual(snapshot);
  expect(Buffer.from(signed)).not.toEqual(snapshot);
  if (process.env.TWO_PAGE_PDF_QA_OUTPUT) await writeFile(`${process.env.TWO_PAGE_PDF_QA_OUTPUT}/compromiso-dos-paginas-firma-ejemplo.pdf`, signed);
});

it("admite pasaporte y contratos sin mora y rechaza excedentes sin recortar ni añadir hojas", async () => {
  const document = example(); document.lateAnnualRate = 0;
  document.customer = { ...document.customer, rut: "", document: { type: "passport", country: "AR", number: "AAA123456" } };
  expect((await PDFDocument.load(await creditAgreementPdf(document))).getPageCount()).toBe(2);
  const oversized = example(); oversized.representative.authority = "Referencia de facultades extraordinariamente extensa. ".repeat(100);
  await expect(creditAgreementPdf(oversized)).rejects.toBeInstanceOf(TwoPageAgreementError);
});

it("mantiene dos hojas con referencias reales extensas, cuatro cuotas y nombres compuestos", async () => {
  const document = example();
  document.customer.name = "María Josefa Alejandra de los Ángeles Ejemplo de Demostración";
  document.representative.authority = "Escritura pública de constitución y facultades vigentes de representación, anotación del Registro de Comercio, referencia de prueba para verificar el diseño.";
  document.sale.productName = "Lentes ópticos con cristales progresivos, tratamiento antirreflejo y montura de acetato de demostración";
  expect((await PDFDocument.load(await creditAgreementPdf(document))).getPageCount()).toBe(2);
});

it("mantiene la modalidad en papel con firma preimpresa en dos hojas", async () => {
  const document = specimen(TWO_PAGE_AGREEMENT_PROPOSAL);
  document.representative.signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg==";
  document.installments = monthlyInstallments(22500, 4, "2030-01-30");
  expect((await PDFDocument.load(await creditAgreementPdf(document))).getPageCount()).toBe(2);
});

it("no utiliza el área reservada en modelos anteriores o PDFs de tamaño incorrecto", async () => {
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage();
  const evidence = { saleId: "qa", originalHash: "a".repeat(64), signedAt: new Date(), representativeAt: new Date() };
  await expect(addTwoPageDigitalEvidence(pdf, evidence)).rejects.toThrow(/espacio de firma/);
});
