// @vitest-environment node
import {it,expect,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {PDFDocument} from "pdf-lib";
const m=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("./db",()=>({clientTable:(v:string)=>v,clientPool:()=>({query:m.query,connect:async()=>({query:m.query,release:()=>{}})})}));
import {AGREEMENT_PROPOSAL} from "./agreement-model";
import {createAgreementModel,transitionAgreementModel,listAgreementModels,modelSample,specimen,assertApprovedModel,modelHash} from "./agreement-registry";
import {prepareCommitment,getStoredCommitment,storedAgreementPdf,saveContractSettings,saleInterestQuote} from "./commitments";
import {protectClientValue} from "./privacy";
import {changeSaleState,recordSalePayment,reverseSalePayment} from "./sales";
import {recordAgreementAcceptance,effectiveAgreementDate,signedAgreement} from "./agreement-acceptance";
import {creditAgreementPdf} from "./credit-agreement-pdf";
it("aprobación explícita, emisión cifrada inmutable, retiro e historial; firma y entrega separadas",async()=>{
 vi.stubEnv("CLIENT_DIGITAL_AGREEMENT_MODEL_HASH",modelHash(AGREEMENT_PROPOSAL));
 vi.stubEnv("CLIENT_DATA_KEY",Buffer.alloc(32,9).toString("base64"));const db=new PGlite();
 try{
 for(const name of ["001-customers","002-sales","003-audit","007-installments","010-payment-commitments"]){await db.exec(await readFile(`sql/clients/${name}.sql`,"utf8"));}
 // Snapshot before the additive migration must remain byte-for-byte readable.
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES('qa','Cliente QA','qa@example.invalid','Cliente','QA',$1,'hash',$2)`,[protectClientValue("123456785","rut"),protectClientValue("+56911111111","whatsapp")]);
 await db.query("INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('p','Lente QA',20000,'qa')");
 async function sale(id:string){await db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by) VALUES($1,'qa',$1,'{"appsFlySale":"QA-VENTA","workOrder":"QA-OT"}','p','Lente QA',1,20000,75000,63025,11975,52500,22500,22500,'start',30,40000,1,true,'legacy','qa')`,[id]);await db.query(`INSERT INTO oc_client_installments(id,sale_id,number,due_date,amount) VALUES($1,$1,1,'2026-12-15',22500)`,[id]);}
 await sale("historical");await db.query("UPDATE oc_client_sales SET remaining=0 WHERE id='historical'");const old=JSON.stringify({version:"historical-frozen",customer:{name:"Original"}});await db.query("INSERT INTO oc_client_commitments(sale_id,user_id,version,payload_enc,content_hash,prepared_by) VALUES('historical','qa','legacy',$1,$2,'qa')",[protectClientValue(old,"contract-document"),createHash("sha256").update(old).digest("hex")]);
 await db.exec(await readFile("sql/clients/019-agreement-models.sql","utf8"));await db.exec(await readFile("sql/clients/019-agreement-models.sql","utf8"));
 m.query.mockImplementation((s:string,v?:unknown[])=>db.query(s,v));
 const settings={representativeName:"Representante QA",representativeRut:"12345678-5",representativeAuthority:"Escritura ficticia QA, no usar en contratos reales",signature:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg==",paymentMethod:"both",authorizeSignature:true,authorizeCurrentTerms:true,legalAnnualMaximum:18,legalLimitChecked:true};
 await saveContractSettings(settings,"qa-owner");await sale("new-sale");
 await expect(prepareCommitment("new-sale","qa")).rejects.toThrow(/aprobado/);
 const id=await createAgreementModel({definition:AGREEMENT_PROPOSAL,note:"Propuesta ficticia para prueba local"},"qa-owner");
 expect((await listAgreementModels()).models[0].status).toBe("draft");await expect(prepareCommitment("new-sale","qa")).rejects.toThrow(/aprobado/);
 await expect(transitionAgreementModel({id,status:"approved",note:"No debe saltarse revisión"},"qa-owner")).rejects.toThrow(/permitida/);
 await transitionAgreementModel({id,status:"pending",note:"Remitido a revisión QA"},"qa-owner");
 await expect(transitionAgreementModel({id,status:"approved",note:"Faltan confirmaciones"},"qa-owner")).rejects.toThrow(/Revisa/);
 await transitionAgreementModel({id,status:"approved",note:"Aprobación solo en memoria QA",reviewedSample:true,reviewedLegal:true,reviewedPrint:true},"qa-reviewer");
 const row=(await listAgreementModels()).models[0];expect(assertApprovedModel(row)).toEqual(AGREEMENT_PROPOSAL);expect(()=>assertApprovedModel({...row,content_hash:"0".repeat(64)})).toThrow(/integridad/);
 expect(await modelSample(id)).toBeInstanceOf(Uint8Array);
 await prepareCommitment("new-sale","qa");const originalPdf=await storedAgreementPdf("new-sale","qa");const original=await getStoredCommitment("new-sale","qa");expect(original?.model?.hash).toBe(modelHash(AGREEMENT_PROPOSAL));expect(original?.references).toEqual({appsFlySale:"QA-VENTA",workOrder:"QA-OT"});
 expect((await db.query<{signed_at:string|null}>("SELECT signed_at FROM oc_client_sales WHERE id='new-sale'")).rows[0].signed_at).toBeNull();
 await expect(db.query("UPDATE oc_client_agreement_models SET definition='{}' WHERE id=$1",[id])).rejects.toThrow(/new model version/);
 await expect(db.query("DELETE FROM oc_client_commitments WHERE sale_id='new-sale'")).rejects.toThrow(/immutable/);
 await expect(db.query("UPDATE oc_client_commitments SET content_hash=$1 WHERE sale_id='historical'",["0".repeat(64)])).rejects.toThrow(/immutable/);
 await transitionAgreementModel({id,status:"retired",note:"Retiro de ejemplo QA"},"qa-owner");await db.query("UPDATE oc_client_sales SET remaining=0 WHERE id='new-sale'");await sale("blocked");await expect(prepareCommitment("blocked","qa")).rejects.toThrow(/aprobado/);
 await prepareCommitment("new-sale","qa");expect(await getStoredCommitment("new-sale","qa")).toEqual(original);expect(await storedAgreementPdf("new-sale","qa")).toEqual(originalPdf);await expect(storedAgreementPdf("new-sale","other")).rejects.toThrow();expect(await getStoredCommitment("historical","qa")).toEqual(JSON.parse(old));
 const clone=structuredClone(AGREEMENT_PROPOSAL);clone.version=2;await createAgreementModel({definition:clone,note:"Nueva propuesta no aprobada"},"qa-owner");expect((await listAgreementModels()).models.find(x=>x.version===2)?.status).toBe("draft");
 const doc=original!;const effective=await effectiveAgreementDate(doc,"new-sale",new Date().toISOString());expect(effective).toBeNull();
 const date=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const bytes=await creditAgreementPdf(doc),evidence={signedOn:date,copyDeliveredOn:date,deliveryMethod:"paper",deliveryReference:"Entrega de ejemplo QA no real",originalReference:"Carpeta QA local ficticia",legalAnnualLimit:12,legalLimitReference:"Verificación CMF ficticia QA",legalLimitChecked:true,acceptanceChecked:true,signedPdf:`data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`};
 const conn={query:m.query} as unknown as Parameters<typeof recordAgreementAcceptance>[0];
 await expect(recordAgreementAcceptance(conn,doc,{...evidence,signedOn:"2035-01-01"},"qa")).rejects.toThrow(/futuras/);
 await changeSaleState({action:"sign",saleId:doc.sale.id,...evidence},"qa");expect(await effectiveAgreementDate(doc,"new-sale",null)).toEqual({date,legalAnnualLimit:12});expect((await signedAgreement("new-sale"))?.bytes).toEqual(Buffer.from(bytes));
 await expect(db.query("DELETE FROM oc_client_agreement_acceptances WHERE sale_id='new-sale'")).rejects.toThrow(/immutable/);
 expect((await listAgreementModels()).history.filter(h=>h.model_id===id).map(h=>h.to_status)).toEqual(["draft","pending","approved","retired"]);
 // Exercise the actual locked payment transaction, lower legal cap, abono and reversal.
 await db.query("UPDATE oc_client_sales SET remaining=0 WHERE id='blocked'");
 await db.query("UPDATE oc_client_sales SET remaining=22500 WHERE id='new-sale'");
 await db.query("UPDATE oc_client_credit_balances SET principal_outstanding=22500 WHERE user_id='qa'");
 vi.setSystemTime(new Date("2027-03-16T15:00:00Z"));
 const before=await saleInterestQuote("new-sale","2027-03-16","qa");expect(before.annualRate).toBe(12);expect(before.due).toBe(232);
 const payment={saleId:"new-sale",requestKey:"00000000-0000-4000-8000-000000000011",amount:10000,paidOn:"2027-03-01",reference:"Abono QA ficticio"};
 const pid=await recordSalePayment(payment,"qa");expect(await recordSalePayment(payment,"qa")).toBe(pid);
 const after=await saleInterestQuote("new-sale","2027-03-16","qa");expect(after).toMatchObject({due:182,principalDue:12500});
 await expect(recordSalePayment({...payment,amount:12500,paidOn:"2027-03-16",requestKey:"00000000-0000-4000-8000-000000000012"},"qa")).rejects.toThrow(/mora pendiente/);
 await recordSalePayment({...payment,amount:12500,interestAmount:182,paidOn:"2027-03-16",requestKey:"00000000-0000-4000-8000-000000000012"},"qa");
 expect((await saleInterestQuote("new-sale","2027-03-16","qa")).principalDue).toBe(0);
 await reverseSalePayment({paymentId:pid,reason:"Corrección ficticia QA"},"qa");await reverseSalePayment({paymentId:pid,reason:"Corrección ficticia QA"},"qa");
 expect((await saleInterestQuote("new-sale","2027-03-16","qa")).principalDue).toBe(10000);
 vi.useRealTimers();
 const example=specimen(AGREEMENT_PROPOSAL),pdfBytes=await creditAgreementPdf(example),pdf=await PDFDocument.load(pdfBytes);expect(pdf.getPageCount()).toBeLessThanOrEqual(6);
 if(process.env.PDF_QA_OUTPUT){await mkdir(process.env.PDF_QA_OUTPUT,{recursive:true});await writeFile(`${process.env.PDF_QA_OUTPUT}/compromiso-propuesta-revisada.pdf`,pdfBytes);}
 }finally{vi.useRealTimers();await db.close();vi.unstubAllEnvs();}
},60000);
