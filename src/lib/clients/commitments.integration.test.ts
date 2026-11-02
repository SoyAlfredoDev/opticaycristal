// @vitest-environment node
import { expect,it,vi } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const mock=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("./db",()=>({clientTable:(name:string)=>name,clientPool:()=>({query:mock.query,connect:async()=>({query:mock.query,release:()=>{}})})}));
import { protectClientValue } from "./privacy";
import { recordSalePayment,reverseSalePayment,createSale } from "./sales";
import { saveContractSettings,prepareCommitment,getStoredCommitment } from "./commitments";
it("verifica migración y generación inmutable en PostgreSQL local de memoria",async()=>{
 const db=new PGlite();vi.stubEnv("CLIENT_DATA_KEY",Buffer.alloc(32,7).toString("base64"));
 try{
  for(const migration of ["001-customers","002-sales","003-audit","007-installments","010-payment-commitments","010-payment-commitments"]){await db.exec(await readFile(`sql/clients/${migration}.sql`,"utf8"));}
  mock.query.mockImplementation((sql:string,values?:unknown[])=>db.query(sql,values));
  await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES('qa-customer','Cliente Prueba','qa@example.invalid','Cliente','Prueba',$1,'qa-hash',$2)`,[protectClientValue("123456785","rut"),protectClientValue("+56911111111","whatsapp")]);
  await db.query("INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('qa-product','Lente de prueba',20000,'qa-owner')");
  await db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by) VALUES('qa-sale','qa-customer','qa-key','{}','qa-product','Lente de prueba',1,20000,45000,37815,7185,31500,13500,13500,'start',30,40000,1,true,'legacy','qa-owner')`);
  await db.query("INSERT INTO oc_client_installments(id,sale_id,number,due_date,amount) VALUES('qa-installment','qa-sale',1,'2026-12-02',13500)");
  await expect(db.query("INSERT INTO oc_client_payments(id,sale_id,request_key,amount,interest_waived,paid_on,reference,created_by) VALUES('qa-invalid-reason','qa-sale','qa-invalid-request',0,1,'2026-11-02','QA','qa-owner')")).rejects.toThrow(/oc_client_payments_capital_check/);
  await saveContractSettings({representativeName:"Representante Prueba",representativeRut:"12345678-5",paymentMethod:"both",signature:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NwAAAABJRU5ErkJggg==",authorizeSignature:true,authorizeCurrentTerms:true,legalAnnualMaximum:41.02,legalLimitChecked:true},"qa-owner");
  await prepareCommitment("qa-sale","qa-staff");
  const original=await getStoredCommitment("qa-sale","qa-customer");
  expect(original?.sale.credit).toBe(13500);expect(original?.representative.name).toBe("Representante Prueba");expect(original?.installments).toEqual([{number:1,dueDate:"2026-12-02",amount:13500}]);
  await db.query("UPDATE oc_client_user SET \"firstName\"='Nombre actualizado' WHERE id='qa-customer'");await prepareCommitment("qa-sale","qa-staff");
  expect(await getStoredCommitment("qa-sale","qa-customer")).toEqual(original);expect(await getStoredCommitment("qa-sale","other-customer")).toBeNull();
  const count=await db.query<{n:number}>("SELECT count(*)::int AS n FROM oc_client_commitments");expect(count.rows[0].n).toBe(1);
  const unchanged=await db.query("SELECT credit,remaining,signed_at FROM oc_client_sales WHERE id='qa-sale'");expect(unchanged.rows[0]).toEqual({credit:13500,remaining:13500,signed_at:null});

  // Exercise actual payment/reversal transactions against a new, signed contract.
  const configured=await db.query<{payload_enc:string}>("SELECT payload_enc FROM oc_client_contract_settings");
  const {revealClientValue}=await import("./privacy");
  const settings=JSON.parse(revealClientValue(configured.rows[0].payload_enc,"contract-settings"));settings.latePolicyEffectiveAt="2026-07-01T00:00:00.000Z";
  await db.query("DELETE FROM oc_client_commitments WHERE sale_id='qa-sale'");
  await db.query("UPDATE oc_client_contract_settings SET payload_enc=$1",[protectClientValue(JSON.stringify(settings),"contract-settings")]);
  await db.query("UPDATE oc_client_sales SET created_at='2026-07-02T12:00:00Z' WHERE id='qa-sale'");
  await db.query("UPDATE oc_client_installments SET due_date='2026-08-04' WHERE sale_id='qa-sale'");
  await prepareCommitment("qa-sale","qa-staff");
  await db.query("UPDATE oc_client_sales SET signed_at='2026-07-02T12:00:00Z' WHERE id='qa-sale'");
  await db.query("UPDATE oc_client_credit_balances SET principal_outstanding=13500 WHERE user_id='qa-customer'");
  const payment={saleId:"qa-sale",requestKey:"00000000-0000-4000-8000-000000000001",amount:13500,interestAmount:202,paidOn:"2026-11-02",reference:"Comprobante QA"};
  const id=await recordSalePayment(payment,"qa-staff");expect(await recordSalePayment(payment,"qa-staff")).toBe(id);
  const settled=await db.query<{remaining:number}>("SELECT remaining FROM oc_client_sales WHERE id='qa-sale'");expect(settled.rows[0].remaining).toBe(0);
  await reverseSalePayment({paymentId:id,reason:"Corrección de prueba"},"qa-staff");
  const interestId=await recordSalePayment({...payment,amount:0,requestKey:"00000000-0000-4000-8000-000000000002"},"qa-staff");
  await recordSalePayment({...payment,interestAmount:0,requestKey:"00000000-0000-4000-8000-000000000003"},"qa-staff");
  await expect(reverseSalePayment({paymentId:interestId,reason:"Prueba de reversa"},"qa-staff")).rejects.toThrow(/Reabre/);

  await db.query("UPDATE oc_client_user SET \"emailVerified\"=true WHERE id='qa-customer'");
  await db.query("DELETE FROM oc_client_contract_settings");
  await expect(createSale({customerId:"qa-customer",productId:"qa-product",quantity:1,total:45000,credit:13500,installmentCount:1,firstDueDate:new Date(Date.now()+30*86400000).toISOString().slice(0,10),identityChecked:true,depositReceived:true,requestKey:"00000000-0000-4000-8000-000000000004"},"qa-staff")).rejects.toThrow(/configurar/);
  expect((await db.query<{n:number}>("SELECT count(*)::int AS n FROM oc_client_sales")).rows[0].n).toBe(1);
  expect((await db.query<{principal_outstanding:number}>("SELECT principal_outstanding FROM oc_client_credit_balances WHERE user_id='qa-customer'")).rows[0].principal_outstanding).toBe(0);
 }finally{await db.close();vi.unstubAllEnvs();}
},30000);
