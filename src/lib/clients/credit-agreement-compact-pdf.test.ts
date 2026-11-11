// @vitest-environment node
import {it,expect} from "vitest";
import {PDFDocument} from "pdf-lib";
import {Font} from "@pdf-lib/standard-fonts";
import {mkdir,writeFile} from "node:fs/promises";
import {creditAgreementPdf} from "./credit-agreement-pdf";
import {specimen} from "./agreement-registry";
import {AGREEMENT_PROPOSAL,COMPACT_AGREEMENT_PROPOSAL,validateAgreementModel} from "./agreement-model";
import {COMPACT_AGREEMENT_BODY_PT} from "./credit-agreement-compact-pdf";
import {monthlyInstallments} from "./financing";
it("reduce hojas sin cambiar cláusulas, conserva v1 y respeta la altura de letra",async()=>{
 expect(COMPACT_AGREEMENT_PROPOSAL.clauses).toEqual(AGREEMENT_PROPOSAL.clauses);
 expect(validateAgreementModel(AGREEMENT_PROPOSAL).layout).toBe("a4-readable-v1");expect(validateAgreementModel(COMPACT_AGREEMENT_PROPOSAL).layout).toBe("a4-compact-v2");
 for(const name of ["Helvetica","Helvetica-Bold"] as const)expect(Font.load(name).XHeight!/1000*COMPACT_AGREEMENT_BODY_PT*25.4/72).toBeGreaterThanOrEqual(2.5);
 const original=specimen(AGREEMENT_PROPOSAL),compact=specimen(COMPACT_AGREEMENT_PROPOSAL),snapshot=JSON.stringify(compact);
 const oldPdf=await PDFDocument.load(await creditAgreementPdf(original)),bytes=await creditAgreementPdf(compact),pdf=await PDFDocument.load(bytes);
 expect(oldPdf.getPageCount()).toBe(4);expect(pdf.getPageCount()).toBeLessThan(oldPdf.getPageCount());expect(JSON.stringify(compact)).toBe(snapshot);
 if(process.env.COMPACT_PDF_QA_OUTPUT){await mkdir(process.env.COMPACT_PDF_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.COMPACT_PDF_QA_OUTPUT}/compromiso-pago-compacto.pdf`,bytes);}
});
it("mantiene cuatro cuotas y datos extensos sin recortes de página",async()=>{const d=specimen(COMPACT_AGREEMENT_PROPOSAL);d.sale={...d.sale,total:500000,net:420168,vat:79832,deposit:350000,credit:150000};d.installments=monthlyInstallments(150000,4,"2030-01-30");d.representative.authority="Referencia ficticia que debe verificarse antes de emitir. ".repeat(16);const pdf=await PDFDocument.load(await creditAgreementPdf(d));expect(pdf.getPageCount()).toBeLessThanOrEqual(5);for(const p of pdf.getPages()){expect(p.getWidth()).toBeCloseTo(595.28);expect(p.getHeight()).toBeCloseTo(841.89);}});
