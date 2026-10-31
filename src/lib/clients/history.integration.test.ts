// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const state=vi.hoisted(()=>({ pool:null as unknown, calls:0, user:"own" as string|null }));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock("./auth",()=>({customerSession:async()=>state.user?{user:{id:state.user}}:null}));
import { getCustomerSnapshot } from "./store";
import { getCustomerHistoryPage, getCustomerPaymentPage, getCustomerDocumentSale } from "./history";
import { protectClientValue } from "./privacy";
import { GET as snapshot } from "@/app/api/clientes/resumen/route";
import { GET as history } from "@/app/api/clientes/compras/route";
import { GET as payments } from "@/app/api/clientes/compras/[id]/pagos/route";
const db=new PGlite();
state.pool={ query:async(sql:string,values?:unknown[])=>{state.calls++;return db.query(sql,values);} };
const request=(path:string,etag="")=>new Request(`http://localhost/api/clientes/${path}`,{headers:etag?{"If-None-Match":etag}:{}});
async function seedSale(id:string,user="own",credit=0,micro=0){
 await db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by,created_at)
 VALUES($1,$2,$1,'{}','product','Lentes de prueba',1,6000,119000,100000,19000,$3,$4,$5,'start',30,40000,$6,true,'test','staff',$7)`,
 [id,user,119000-credit,credit,credit?25000:0,credit?1:0,`2026-01-01 10:00:00.${String(micro).padStart(6,'0')}+00`]);
}
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));
 for(const name of ["001-customers.sql","002-sales.sql","003-audit.sql","007-installments.sql","009-customer-history-indexes.sql","009-customer-history-indexes.sql"])await db.exec(await readFile(`sql/clients/${name}`,"utf8"));
 for(const user of ["own","other"])await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES($1,$1,$2,'Cliente','Prueba',$3,$1,$4,true)`,[user,`${user}@example.invalid`,protectClientValue("123456785","rut"),protectClientValue("+56900000000","whatsapp")]);
 await db.query(`INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('product','Producto QA',6000,'staff')`);
 for(let n=0;n<24;n++)await seedSale(`sale-${String(n).padStart(2,'0')}`,"own",n===0?30000:0,n);
 await seedSale("private-sale","other",0,99);
 await db.query(`INSERT INTO oc_client_installments(id,sale_id,number,due_date,amount,paid) VALUES('installment','sale-00',1,'2030-01-31',30000,5000)`);
 await db.query(`INSERT INTO oc_client_credit_balances(user_id,principal_outstanding) VALUES('own',25000) ON CONFLICT(user_id) DO UPDATE SET principal_outstanding=25000`);
 for(let n=0;n<25;n++)await db.query(`INSERT INTO oc_client_payments(id,sale_id,request_key,amount,paid_on,reference,created_by,created_at) VALUES($1,'sale-00',$1,200,'2026-01-01','Pago de prueba','staff',$2)`,[`payment-${String(n).padStart(2,'0')}`,`2026-01-01 10:00:00.${String(n).padStart(6,'0')}+00`]);
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential("Resumen ligero e historial privado paginado",()=>{
 it("devuelve cupo, conteos y próxima cuota global en una consulta sin historial completo",async()=>{
  state.calls=0;const result=await getCustomerSnapshot("own");expect(state.calls).toBe(1);
  expect(result?.customer).toMatchObject({credit:{capacity:15000,principalOutstanding:25000},activity:{purchaseCount:24,creditCount:1,nextInstallment:{dueDate:"2030-01-31",amount:30000,paid:5000}}});
  expect(result?.customer).not.toHaveProperty("purchases");expect(result?.tiers.map(t=>t.maxInstallments)).toEqual([1,2,3,4]);
  expect(JSON.stringify(result)).not.toMatch(/private-sale|protectedCost|created_by|Cipher/);
 });
 it("pagina sin repetir ni saltar ventas con marcas de tiempo del mismo milisegundo",async()=>{
  const ids:string[]=[];let cursor:string|null=null;
  do{state.calls=0;const page=await getCustomerHistoryPage("own",false,cursor);expect(state.calls).toBe(1);expect(page.sales.length).toBeLessThanOrEqual(10);ids.push(...page.sales.map(s=>s.id));cursor=page.nextCursor;}while(cursor);
  expect(ids).toHaveLength(24);expect(new Set(ids).size).toBe(24);expect(ids[0]).toBe("sale-23");expect(ids.at(-1)).toBe("sale-00");
  const credits=await getCustomerHistoryPage("own",true,null);expect(credits.sales.map(s=>s.id)).toEqual(["sale-00"]);
  expect(credits.sales[0].payments).toHaveLength(10);expect(credits.sales[0].paymentsNextCursor).toBeTruthy();
 });
 it("mantiene el cursor estable si entra otra venta al comienzo",async()=>{
  const first=await getCustomerHistoryPage("own",false,null);await seedSale("new-sale","own",0,100);
  const second=await getCustomerHistoryPage("own",false,first.nextCursor);
  expect(second.sales[0].id).toBe("sale-13");expect(second.sales.map(s=>s.id)).not.toContain(first.sales.at(-1)?.id);
 });
 it("pagina los pagos, conserva su importe y no entrega pagos de ventas ajenas",async()=>{
  const ids:string[]=[];let cursor:string|null=null;
  do{state.calls=0;const page=await getCustomerPaymentPage("own","sale-00",cursor);expect(state.calls).toBe(1);expect(page!.payments.length).toBeLessThanOrEqual(10);ids.push(...page!.payments.map(p=>p.id));expect(page!.payments.every(p=>p.amount===200)).toBe(true);cursor=page!.nextCursor;}while(cursor);
  expect(new Set(ids).size).toBe(25);expect(await getCustomerPaymentPage("other","sale-00",null)).toBeNull();
 });
 it("autentica antes de datos/versiones, ignora IDs externos y rechaza cursores inválidos",async()=>{
  const response=await snapshot(request("resumen?userId=other"));expect(response.status).toBe(200);expect((await response.clone().json()).customer.id).toBe("own");
  expect(response.headers.get("server-timing")).toMatch(/session;dur=\d.*data;dur=/);expect(response.headers.get("cache-control")).toContain("no-store");
  const etag=response.headers.get("etag")!;expect((await snapshot(request("resumen",etag))).status).toBe(304);
  expect((await history(request("compras?cursor=garbage"))).status).toBe(400);
  expect((await payments(request("compras/private-sale/pagos"),{params:Promise.resolve({id:"private-sale"})})).status).toBe(404);
  state.user=null;state.calls=0;expect((await snapshot(request("resumen",etag))).status).toBe(401);expect(state.calls).toBe(0);state.user="own";
 });
 it("invalida historial al firmar o registrar un movimiento, aunque no cambie el total de compras",async()=>{
  const before=await getCustomerSnapshot("own");
  await db.query(`UPDATE oc_client_sales SET signed_at=now() WHERE id='sale-00'`);
  const after=await getCustomerSnapshot("own");expect(after?.historyVersion).not.toBe(before?.historyVersion);
  await db.query(`UPDATE oc_client_credit_balances SET updated_at=now(),principal_outstanding=24000 WHERE user_id='own'`);
  const latest=await getCustomerSnapshot("own");expect(latest?.historyVersion).not.toBe(after?.historyVersion);expect(latest?.customer.credit.capacity).toBe(16000);
 });
});

it("el compromiso obtiene una única venta propia sin cargar todo el historial",async()=>{
 state.calls=0;const sale=await getCustomerDocumentSale("own","sale-00");expect(state.calls).toBe(1);expect(sale?.id).toBe("sale-00");expect(sale?.installments).toHaveLength(1);
 expect(await getCustomerDocumentSale("other","sale-00")).toBeNull();
});
