// @vitest-environment node
import {it,expect} from "vitest";
import {mkdir,writeFile} from "node:fs/promises";
import {PDFDocument,PDFDict,PDFName} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {creditAgreementPdf} from "./credit-agreement-pdf";
import {specimen} from "./agreement-registry";
import {AGREEMENT_PROPOSAL,COMPACT_AGREEMENT_PROPOSAL,FORMAL_AGREEMENT_PROPOSAL,validateAgreementModel} from "./agreement-model";
import {formalAgreementAssets,FORMAL_AGREEMENT_BODY_PT} from "./credit-agreement-formal-pdf";
import {monthlyInstallments} from "./financing";
it("reduce la tipografía a 13 pt con altura real de minúsculas de al menos 2,5 mm",async()=>{const a=await formalAgreementAssets();for(const bytes of [a.regular,a.bold]){const f=fontkit.create(new Uint8Array(bytes));const b=f.glyphForCodePoint(120).bbox;expect((b.maxY-b.minY)/f.unitsPerEm*FORMAL_AGREEMENT_BODY_PT*25.4/72).toBeGreaterThanOrEqual(2.5);}expect(FORMAL_AGREEMENT_BODY_PT).toBeLessThan(13.6);});
it("mantiene cláusulas y versiones anteriores, con fuentes incrustadas y muestra formal",async()=>{for(const model of [AGREEMENT_PROPOSAL,COMPACT_AGREEMENT_PROPOSAL,FORMAL_AGREEMENT_PROPOSAL])expect(validateAgreementModel(model).layout).toBe(model.layout);expect(FORMAL_AGREEMENT_PROPOSAL.clauses).toEqual(AGREEMENT_PROPOSAL.clauses);
 const d=specimen(FORMAL_AGREEMENT_PROPOSAL),before=JSON.stringify(d),bytes=await creditAgreementPdf(d),pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeLessThanOrEqual(3);expect(JSON.stringify(d)).toBe(before);
 // Embedded font file, rather than relying on a viewer's replacement font.
 const fonts=pdf.context.enumerateIndirectObjects().filter(([,o])=>o instanceof PDFDict&&(o as PDFDict).has(PDFName.of("FontFile2")));expect(fonts.length).toBeGreaterThanOrEqual(2);
 if(process.env.FORMAL_PDF_QA_OUTPUT){await mkdir(process.env.FORMAL_PDF_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.FORMAL_PDF_QA_OUTPUT}/compromiso-pago-formal.pdf`,bytes);}
});
it("admite cuatro mensualidades y datos extensos sin alterar el original",async()=>{const d=specimen(FORMAL_AGREEMENT_PROPOSAL);d.sale={...d.sale,total:500000,net:420168,vat:79832,deposit:350000,credit:150000};d.installments=monthlyInstallments(150000,4,"2030-01-30");d.customer.name="Cliente de demostración ".repeat(6);d.representative.name="Representante de demostración ".repeat(5);d.representative.authority="Antecedente ficticio que debe verificarse antes de emitir. ".repeat(16);const pdf=await PDFDocument.load(await creditAgreementPdf(d));expect(pdf.getPageCount()).toBeLessThanOrEqual(5);for(const p of pdf.getPages()){expect(p.getWidth()).toBeCloseTo(595.28);expect(p.getHeight()).toBeCloseTo(841.89);}});
