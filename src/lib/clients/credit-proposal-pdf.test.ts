// @vitest-environment node
import { expect,it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir,writeFile } from "node:fs/promises";
import { monthlyInstallments } from "./financing";
import { creditProposalPdf } from "./credit-proposal-pdf";
import type { AdminSimulation } from "./admin-simulation";
it("genera una propuesta A4 válida sin firma ni operación financiera",async()=>{
 const quote:AdminSimulation={mode:"tier",customer:null,tier:{code:"elite",name:"Élite",maxAmount:150000,maxPercent:70,maxInstallments:4},productName:null,total:500000,net:420168,vat:79832,credit:150000,deposit:350000,installments:monthlyInstallments(150000,4,"2026-12-02"),reason:null,fingerprint:"a".repeat(64),issuedAt:"2026-11-02T15:00:00.000Z"};
 const bytes=await creditProposalPdf(quote),pdf=await PDFDocument.load(bytes);
 expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.28);expect(pdf.getTitle()).toBe("Propuesta de crédito - Óptica & Cristal");expect(pdf.getForm().getFields()).toHaveLength(0);
 if(process.env.PDF_QA_OUTPUT){await mkdir(process.env.PDF_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.PDF_QA_OUTPUT}/propuesta-credito-ejemplo.pdf`,bytes);}
});
