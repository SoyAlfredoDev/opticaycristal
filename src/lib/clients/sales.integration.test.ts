// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
const state = vi.hoisted(()=>({pool:null as unknown}));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
import { changeSaleState, reverseSalePayment, createSale, findCustomerByRut, listCustomerSales, listSaleProducts, parseSale, quoteSale, recordSalePayment, saveSaleProduct, todayChile } from "./sales";
import { runSaleOperation,recoverSaleOperation } from "./operations";
import { allowStaffLogin } from "./staff-access";
import { clientFingerprint } from "./privacy";
const db = new PGlite();
const conn={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
let productId="",saleId="";
const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
const firstDue="2030-01-31";
const input=()=>parseSale({customerId:"alice",productId,quantity:1,total:119000,credit:35700,installmentCount:1,firstDueDate:firstDue,identityChecked:true,depositReceived:true,requestKey:randomUUID()});
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));
 await db.exec(await readFile("sql/clients/001-customers.sql","utf8"));
 await db.exec(await readFile("sql/clients/002-sales.sql","utf8"));
 await db.exec(await readFile("sql/clients/003-audit.sql","utf8"));
 await db.exec(await readFile("sql/clients/003-audit.sql","utf8"));
 for(const [id,rut,verified,tier] of [["alice","123456785",true,"start"],["bob","111111111",true,"premium"],["unverified","222222222",false,"start"]]) {
  await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES($1,$1,$2,'Cliente','Prueba','encrypted',$3,'encrypted',$4,$5)`,[id,`${id}@example.com`,clientFingerprint(String(rut),"rut"),verified,tier]);
 }
 productId=await saveSaleProduct({name:"Paquete óptico de prueba",protectedCost:50000},"seller");
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential("Ventas y pagos con PostgreSQL aislado",()=>{
 it("busca RUT normalizado y exige registro previo",async()=>{
  expect(await findCustomerByRut("12.345.678-5")).toBe("alice");
  await expect(findCustomerByRut("12.345.678-9")).rejects.toThrow("RUT");
  await expect(findCustomerByRut("7.654.321-6")).rejects.toThrow("registrado");
 });
 it("desglosa IVA desde total y carga costo configurado sin exigir WhatsApp",async()=>{
  const q=await quoteSale(input());expect(q).toMatchObject({total:119000,net:100000,vat:19000,protectedCost:50000,maximumCredit:35700,minimumDeposit:83300,enabled:true});
  const two=await quoteSale({...input(),quantity:2});expect(two.maximumCredit).toBe(19000);
 });
 it("rechaza producto/costo ausente y permite contado sin correo verificado",async()=>{
  await expect(saveSaleProduct({name:"Sin costo"},"seller")).rejects.toThrow();
  await expect(quoteSale({...input(),productId:"missing"})).rejects.toThrow("producto");
  expect((await quoteSale({...input(),customerId:"unverified"})).maximumCredit).toBe(0);
  const cash={...input(),customerId:"unverified",credit:0,installmentCount:0,firstDueDate:""};
  await createSale(cash,"seller");expect((await listCustomerSales("unverified"))[0]).toMatchObject({credit:0,remaining:0,deposit:119000,installments:[]});
 });
 it("rechaza límites manipulados, identidad sin revisar, pie no recibido y fecha pasada",async()=>{
  await expect(createSale({...input(),credit:40000},"seller")).rejects.toThrow("máximo");
  await expect(createSale({...input(),installmentCount:2},"seller")).rejects.toThrow("cuotas");
  await expect(createSale({...input(),identityChecked:false},"seller")).rejects.toThrow("cédula");
  await expect(createSale({...input(),depositReceived:false},"seller")).rejects.toThrow("pago recibido");
  await expect(createSale({...input(),firstDueDate:todayChile()},"seller")).rejects.toThrow("después de hoy");
  expect(await listCustomerSales("alice")).toHaveLength(0);
 });
 it("crea venta, cuota y saldo juntos y reintentar no duplica",async()=>{
  const b=input();saleId=await createSale(b,"seller");expect(await createSale(b,"seller")).toBe(saleId);
  await expect(createSale({...b,total:120000},"seller")).rejects.toThrow("otros datos");
  const list=await listCustomerSales("alice");expect(list).toHaveLength(1);expect(list[0]).toMatchObject({deposit:83300,credit:35700,remaining:35700});
  expect(list[0].installments).toHaveLength(1);
  expect((await db.query("SELECT principal_outstanding FROM oc_client_credit_balances WHERE user_id='alice'")).rows[0]).toEqual({principal_outstanding:35700});
  expect(JSON.stringify(list)).not.toMatch(/protected_cost|protectedCost|created_by|request_data|rutHash/);
  expect(await listCustomerSales("bob")).toEqual([]);
 });
 it("impide una segunda financiación activa y conserva condiciones tras cambiar producto",async()=>{
  await expect(createSale(input(),"seller")).rejects.toThrow("pendiente");
  await saveSaleProduct({id:productId,name:"Nombre nuevo",protectedCost:60000},"seller");
  expect((await listCustomerSales("alice"))[0].productName).toBe("Paquete óptico de prueba");
  expect((await db.query("SELECT protected_cost FROM oc_client_sales WHERE id=$1",[saleId])).rows[0]).toEqual({protected_cost:50000});
 });
 it("registra pago parcial una sola vez y rechaza sobrepago y fecha futura",async()=>{
  const pay={saleId,requestKey:randomUUID(),amount:10000,paidOn:todayChile(),reference:"Transferencia de prueba"};
  const id=await recordSalePayment(pay,"seller");expect(await recordSalePayment(pay,"seller")).toBe(id);
  await expect(recordSalePayment({...pay,amount:10001},"seller")).rejects.toThrow("otros datos");
  await expect(recordSalePayment({...pay,requestKey:randomUUID(),amount:30000},"seller")).rejects.toThrow("supera");
  await expect(recordSalePayment({...pay,requestKey:randomUUID(),paidOn:tomorrow},"seller")).rejects.toThrow("futuro");
  const sale=(await listCustomerSales("alice"))[0];expect(sale.remaining).toBe(25700);expect(sale.installments[0].paid).toBe(10000);expect(sale.payments).toHaveLength(1);
 });
 it("liquida la deuda y libera el cupo sin crear un cobro adicional por el pie",async()=>{
  await recordSalePayment({saleId,requestKey:randomUUID(),amount:25700,paidOn:todayChile(),reference:"Efectivo de prueba"},"seller");
  const sale=(await listCustomerSales("alice"))[0];expect(sale.remaining).toBe(0);expect(sale.installments[0].paid).toBe(35700);
  expect((await db.query("SELECT principal_outstanding FROM oc_client_credit_balances WHERE user_id='alice'")).rows[0]).toEqual({principal_outstanding:0});
  expect((await quoteSale(input())).maximumCredit).toBe(35700);
 });
 it("reparte mensualidades, aplica pagos a la más antigua y mantiene suma exacta",async()=>{
  const b={...input(),customerId:"bob",total:119001,credit:59001,installmentCount:2};
  const id=await createSale(b,"seller");
  const sale=(await listCustomerSales("bob"))[0];expect(sale.installments.map(i=>[i.dueDate,i.amount])).toEqual([["2030-01-31",29500],["2030-02-28",29501]]);
  await recordSalePayment({saleId:id,requestKey:randomUUID(),amount:30000,paidOn:todayChile(),reference:"Efectivo"},"seller");
  expect((await listCustomerSales("bob"))[0].installments.map(i=>i.paid)).toEqual([29500,500]);
 });
 it("restricciones de BD impiden duplicar financiamiento activo",async()=>{
  const active=(await db.query<{id:string}>("SELECT * FROM oc_client_sales WHERE user_id='bob'")).rows[0];
  await expect(db.query(`INSERT INTO oc_client_sales(id,user_id,request_key,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by,created_at) SELECT $1,user_id,$2,request_data,product_id,product_name,quantity,protected_cost,total,net,vat,deposit,credit,remaining,tier_code,max_percent,max_amount,installment_count,identity_checked,commitment_version,created_by,created_at FROM oc_client_sales WHERE id=$3`,[randomUUID(),randomUUID(),active.id])).rejects.toThrow("oc_client_one_active_credit");
 });
 it("expone los costos solo mediante consulta administrativa de productos",async()=>{expect((await listSaleProducts())[0].protectedCost).toBe(60000);});
});

describe.sequential("Recuperación y correcciones trazables",()=>{
 it("conserva el historial anterior y nuevo de costos",async()=>{
  const changes=await db.query<{old_cost:number|null;new_cost:number}>("SELECT old_cost,new_cost FROM oc_client_product_changes ORDER BY created_at,id");
  expect(changes.rows.some(c=>c.old_cost===50000&&c.new_cost===60000)).toBe(true);
 });
 it("confirma firma presencial de manera idempotente y exige revertir pagos antes de anular",async()=>{
  await changeSaleState({action:"sign",saleId},"seller");
  const signed=(await listCustomerSales("alice"))[0].signedAt;
  await changeSaleState({action:"sign",saleId},"seller");expect((await listCustomerSales("alice"))[0].signedAt).toBe(signed);
  await expect(changeSaleState({action:"cancel",saleId,reason:"Error de prueba"},"seller")).rejects.toThrow("Revierte");
 });
 it("reversa una vez, reasigna cuotas y anula sin borrar venta ni pagos",async()=>{
  const payments=(await listCustomerSales("alice"))[0].payments;
  for(const p of payments){await reverseSalePayment({paymentId:p.id,reason:"Corrección QA"},"seller");await reverseSalePayment({paymentId:p.id,reason:"Corrección QA"},"seller");}
  let sale=(await listCustomerSales("alice"))[0];expect(sale.remaining).toBe(35700);expect(sale.installments[0].paid).toBe(0);expect(sale.payments.every(p=>p.reversed)).toBe(true);
  await changeSaleState({action:"cancel",saleId,reason:"Firma rechazada QA"},"seller");
  await changeSaleState({action:"cancel",saleId,reason:"Firma rechazada QA"},"seller");
  sale=(await listCustomerSales("alice"))[0];expect(sale).toMatchObject({status:"cancelled",remaining:0,credit:35700});expect(sale.payments).toHaveLength(2);
  expect((await db.query("SELECT principal_outstanding FROM oc_client_credit_balances WHERE user_id='alice'")).rows[0]).toEqual({principal_outstanding:0});
  await expect(changeSaleState({action:"sign",saleId},"seller")).rejects.toThrow("firma");
 });
 it("no permite reabrir una deuda si existe otro crédito activo",async()=>{
  const old=(await listCustomerSales("bob"))[0];
  await recordSalePayment({saleId:old.id,requestKey:randomUUID(),amount:old.remaining,paidOn:todayChile(),reference:"Liquidación QA"},"seller");
  await createSale({...input(),customerId:"bob",credit:10000},"seller");
  await expect(reverseSalePayment({paymentId:old.payments[0].id,reason:"Prueba de conflicto"},"seller")).rejects.toThrow("otro crédito activo");
  expect((await listCustomerSales("bob")).find(s=>s.id===old.id)?.remaining).toBe(0);
 });
 it("recupera resultado tras una respuesta perdida y no expone operaciones de otro vendedor",async()=>{
  const raw={...input(),customerId:"unverified",credit:0,installmentCount:0,firstDueDate:"",action:"create"};
  const id=await runSaleOperation(raw,"seller");
  const recovered=await recoverSaleOperation(raw.requestKey,"seller");expect(recovered?.resultId).toBe(id);
  expect(await recoverSaleOperation(raw.requestKey,"other-seller")).toBeNull();
  expect(await runSaleOperation(raw,"seller")).toBe(id);
  expect((await db.query("SELECT count(*)::int AS count FROM oc_client_sales WHERE request_key=$1",[raw.requestKey])).rows[0]).toEqual({count:1});
  await expect(runSaleOperation({...raw,total:120000},"seller")).rejects.toThrow("otro registro");
 });
 it("recupera un registro guardado antes de completar la venta",async()=>{
  const raw={...input(),customerId:"unverified",credit:0,installmentCount:0,firstDueDate:"",action:"create"};
  await db.query("INSERT INTO oc_client_operations(request_key,actor,kind,payload) VALUES($1,'seller','create',$2)",[raw.requestKey,JSON.stringify(raw)]);
  const op=await recoverSaleOperation(raw.requestKey,"seller");expect(op?.resultId).toBeNull();
  const id=await runSaleOperation(op!.payload,"seller");expect((await recoverSaleOperation(raw.requestKey,"seller"))?.resultId).toBe(id);
 });
 it("persistencia del límite de acceso del personal y claves sin IP en claro",async()=>{
  vi.stubEnv("SESSION_SECRET","synthetic-staff-secret-with-more-than-32-characters");
  for(let n=0;n<8;n++)expect(await allowStaffLogin("198.51.100.99")).toBe(true);
  expect(await allowStaffLogin("198.51.100.99")).toBe(false);
  const row=(await db.query<{key:string;count:number}>("SELECT key,count FROM oc_client_admin_login_limits")).rows[0];expect(row.count).toBe(9);expect(row.key).toMatch(/^[a-f0-9]{64}$/);
  await db.query("UPDATE oc_client_admin_login_limits SET reset_at=now()-interval '1 minute'");expect(await allowStaffLogin("198.51.100.99")).toBe(true);
 });
});
