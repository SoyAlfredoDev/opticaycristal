// @vitest-environment node
import { beforeAll,beforeEach,afterAll,describe,expect,it,vi } from "vitest";
import { seedLegacyContractSettings } from "../../../tests/fixtures/legacy-contract-settings";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes,randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const state=vi.hoisted(()=>({pool:null as unknown,staff:true,allowed:true}));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock("./admin",()=>({customerAdminSession:async()=>state.staff?{u:"responsable"}:null,canManageCustomerCategories:()=>state.allowed}));
import { changeCustomerCategory,getCategorySettings } from "./categories";
import { createSale,listCustomerSales,parseSale,quoteSale,recordSalePayment,saveSaleProduct,todayChile } from "./sales";
import { getCustomerProfile } from "./store";
import { protectClientValue } from "./privacy";
import { GET,POST } from "@/app/api/admin/clientes/[id]/categoria/route";
const db=new PGlite(),conn={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};state.pool={query:conn.query,connect:async()=>conn};
const input=(category="vip",expectedCategory="start")=>({category,expectedCategory,requestKey:randomUUID()});
const context=(id="alice")=>({params:Promise.resolve({id})});
const request=(body:unknown,origin="https://opticaycristal.cl")=>new Request("https://opticaycristal.cl/api/admin/clientes/alice/categoria",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeAll(async()=>{vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_APP_URL","https://opticaycristal.cl");for(const name of ["001-customers.sql","002-sales.sql","003-audit.sql","006-categories.sql","006-categories.sql","007-installments.sql","010-payment-commitments.sql","007-installments.sql","010-payment-commitments.sql"])await db.exec(await readFile(`sql/clients/${name}`,"utf8"));await seedLegacyContractSettings(db);},30000);
beforeEach(async()=>{await db.exec("TRUNCATE oc_client_user CASCADE");state.staff=true;state.allowed=true;for(const id of ["alice","bob"])await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES($1,$1,$2,'Cliente','Prueba',$3,$1,$4,true)`,[id,`${id}@example.com`,protectClientValue("123456785","rut"),protectClientValue("+56911112222","whatsapp")]);});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential("Niveles manuales con PostgreSQL aislado",()=>{
 it.each([["start",1],["vip",2],["premium",3],["elite",4]] as const)("registra crédito %s con %i cuotas mensuales y rechaza superar su nivel",async(category,count)=>{
  if(category!=="start")await changeCustomerCategory("alice",input(category),"responsable");
  const productId=await saveSaleProduct({name:"Lentes QA cuotas",protectedCost:20000},"seller");
  const sale=parseSale({customerId:"alice",productId,quantity:1,total:119000,credit:30001,installmentCount:count,firstDueDate:"2030-01-31",identityChecked:true,depositReceived:true,requestKey:randomUUID()});
  expect((await quoteSale(sale)).maxInstallments).toBe(count);
  await expect(createSale({...sale,installmentCount:count+1},"seller")).rejects.toThrow(/cuotas/i);
  await createSale(sale,"seller");const saved=(await listCustomerSales("alice"))[0];
  expect(saved.installments).toHaveLength(count);expect(saved.installments.reduce((sum,item)=>sum+item.amount,0)).toBe(30001);
  expect(saved.installments.map(item=>item.dueDate)).toEqual(["2030-01-31","2030-02-28","2030-03-31","2030-04-30"].slice(0,count));
  const before=JSON.stringify(saved);await db.exec(await readFile("sql/clients/007-installments.sql","utf8"));expect(JSON.stringify((await listCustomerSales("alice"))[0])).toBe(before);
 });

 it("consulta los cuatro niveles y el nivel inicial sin modificarlo",async()=>{const s=await getCategorySettings("alice");expect(s.currentCategory).toBe("start");expect(s.tiers.map(t=>t.code)).toEqual(["start","vip","premium","elite"]);expect(s.history).toEqual([]);});
 it("registra responsable, nivel anterior y nuevo y actualiza el cupo visible al cliente",async()=>{const result=await changeCustomerCategory("alice",input(),"responsable");expect(result.changed).toBe(true);expect(result.settings.currentCategory).toBe("vip");expect(result.settings.history[0]).toMatchObject({from:"Start",to:"VIP",actor:"responsable"});const profile=await getCustomerProfile("alice");expect(profile?.tier).toMatchObject({code:"vip",maxAmount:60000,maxPercent:40,maxInstallments:2});expect(profile?.credit.capacity).toBe(60000);});
 it("un reintento no duplica historial ni repite un cambio anterior después de otro",async()=>{const first=input();await changeCustomerCategory("alice",first,"responsable");expect((await changeCustomerCategory("alice",first,"responsable")).replayed).toBe(true);await changeCustomerCategory("alice",input("premium","vip"),"responsable");const replay=await changeCustomerCategory("alice",first,"responsable");expect(replay.settings.currentCategory).toBe("premium");expect(replay.settings.history).toHaveLength(2);});
 it("rechaza cambios sobre un nivel desactualizada y claves reutilizadas con otros datos",async()=>{const first=input();await changeCustomerCategory("alice",first,"responsable");await expect(changeCustomerCategory("alice",input("elite","start"),"responsable")).rejects.toMatchObject({status:409});await expect(changeCustomerCategory("alice",{...first,category:"premium"},"responsable")).rejects.toMatchObject({status:409});expect((await getCategorySettings("alice")).currentCategory).toBe("vip");});
 it("valida niveles, clientes y claves y evita registrar cambios sin efecto",async()=>{for(const body of [null,[],input("unknown"),{...input(),requestKey:"bad"}])await expect(changeCustomerCategory("alice",body,"responsable")).rejects.toThrow();await expect(changeCustomerCategory("missing",input(),"responsable")).rejects.toMatchObject({status:404});expect((await changeCustomerCategory("alice",input("start"),"responsable")).changed).toBe(false);expect((await getCategorySettings("alice")).history).toEqual([]);});
 it("revierte el nivel si no puede guardar su trazabilidad",async()=>{await db.exec(`CREATE FUNCTION qa_fail_category() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Fallo de auditoría aislado'; END; $$ LANGUAGE plpgsql;CREATE TRIGGER qa_fail_category BEFORE INSERT ON oc_client_category_changes FOR EACH ROW EXECUTE FUNCTION qa_fail_category();`);try{await expect(changeCustomerCategory("alice",input(),"responsable")).rejects.toThrow("auditoría");}finally{await db.exec("DROP TRIGGER qa_fail_category ON oc_client_category_changes;DROP FUNCTION qa_fail_category();");}expect((await getCategorySettings("alice")).currentCategory).toBe("start");});
 it("conserva saldo, cuotas y condiciones de una compra previa al cambiar de nivel",async()=>{
  await changeCustomerCategory("alice",input("elite"),"responsable");const productId=await saveSaleProduct({name:"Paquete de prueba",protectedCost:50000},"responsable");
  const saleId=await createSale(parseSale({customerId:"alice",productId,quantity:1,total:200000,credit:80000,installmentCount:2,firstDueDate:"2030-01-31",identityChecked:true,depositReceived:true,requestKey:randomUUID()}),"responsable");
  const before=await listCustomerSales("alice");await changeCustomerCategory("alice",input("start","elite"),"responsable");expect(await listCustomerSales("alice")).toEqual(before);
  const profile=await getCustomerProfile("alice");expect(profile?.credit).toMatchObject({principalOutstanding:80000,capacity:0,available:0});expect((await quoteSale({customerId:"alice",productId,quantity:1,total:200000})).maximumCredit).toBe(0);
  await recordSalePayment({saleId,requestKey:randomUUID(),amount:80000,paidOn:todayChile(),reference:"Pago de prueba"},"responsable");expect((await getCategorySettings("alice")).currentCategory).toBe("start");expect((await quoteSale({customerId:"alice",productId,quantity:1,total:200000})).maximumCredit).toBe(40000);
 });
 it("exige sesión administrativa, permiso específico y origen correcto",async()=>{state.staff=false;expect((await GET(new Request("https://opticaycristal.cl"),context())).status).toBe(401);expect((await POST(request(input()),context())).status).toBe(401);state.staff=true;state.allowed=false;expect((await POST(request(input()),context())).status).toBe(403);expect((await (await GET(new Request("https://opticaycristal.cl"),context())).json()).canEdit).toBe(false);state.allowed=true;expect((await POST(request(input(),"https://externo.example"),context())).status).toBe(403);});
 it("no admite suplantar al responsable ni al cliente con campos del navegador",async()=>{const result=await POST(request({...input(),actor:"intruso",customerId:"bob",emailVerified:false}),context());expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toContain("no-store");expect((await getCategorySettings("alice")).history[0].actor).toBe("responsable");expect((await getCategorySettings("bob")).currentCategory).toBe("start");expect((await getCustomerProfile("alice"))?.emailVerified).toBe(true);});
});
