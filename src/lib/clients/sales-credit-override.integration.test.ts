// @vitest-environment node
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {beforeAll,beforeEach,afterAll,expect,it,vi} from "vitest";
import type {Pool} from "pg";
import {seedLegacyContractSettings} from "../../../tests/fixtures/legacy-contract-settings";
vi.mock("./db",()=>({clientTable:(name:string)=>name,clientPool:()=>pool}));
import {quoteSale,parseSale,createSale} from "./sales";
import {listAdminSales} from "./sales-register";
import {protectClientValue} from "./privacy";
const db=new PGlite(),connection={query:async(sql:string,args?:unknown[])=>{const r=await db.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
const pool={query:connection.query,connect:async()=>connection} as unknown as Pool;
const base=()=>({customerId:"vip-client",productId:"product",quantity:1,total:75000,pricingPolicy:"category" as const});
const input=(reason?:string)=>parseSale({...base(),credit:60000,installmentCount:2,firstDueDate:"2030-01-31",identityChecked:true,depositReceived:true,conditionsReviewed:true,requestKey:randomUUID(),...(reason!==undefined?{creditOverrideReason:reason}:{})});
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",Buffer.alloc(32,6).toString("base64"));
 for(const f of ["001-customers","002-sales","003-audit","007-installments","010-payment-commitments","019-agreement-models","014-category-sale-pricing","030-sale-internal-controls","031-automatic-sale-controls","032-sale-commitment-uploads"])await db.exec(await readFile(`sql/clients/${f}.sql`,"utf8"));
 await seedLegacyContractSettings(db);
 await db.query("INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('product','Lentes QA',40000,'qa')");
},30000);
beforeEach(async()=>{
 await db.exec("TRUNCATE oc_client_user CASCADE");
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES('vip-client','Cliente QA','qa@example.invalid','Cliente','QA',$1,'qa',$2,true,'vip')`,[protectClientValue("123456785","rut"),protectClientValue("+56911112222","whatsapp")]);
});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
it("omite solo el porcentaje: de $30.000 a $60.000 y pie de $15.000",async()=>{
 expect(await quoteSale(base())).toMatchObject({maximumCredit:30000,maximumCreditAtCapacity:60000,minimumDeposit:45000});
 expect(await quoteSale({...base(),creditOverrideReason:"Condición comercial acordada"})).toMatchObject({maximumCredit:60000,standardMaximumCredit:30000,minimumDeposit:15000,maxInstallments:2,creditOverrideApplied:true});
});
it("guarda motivo, responsable y montos, recalcula cuotas y reintenta sin duplicar",async()=>{
 const body=input("Condición comercial acordada"),id=await createSale(body,"seller-real");expect(await createSale(body,"seller-real")).toBe(id);
 expect((await db.query("SELECT reason,actor,percent_maximum,tier_maximum,applied_credit FROM oc_client_sale_credit_overrides")).rows).toEqual([{reason:"Condición comercial acordada",actor:"seller-real",percent_maximum:30000,tier_maximum:60000,applied_credit:60000}]);
 expect((await db.query("SELECT deposit,credit,remaining,max_percent FROM oc_client_sales")).rows).toEqual([{deposit:15000,credit:60000,remaining:60000,max_percent:40}]);
 expect((await db.query("SELECT amount FROM oc_client_installments ORDER BY number")).rows).toEqual([{amount:30000},{amount:30000}]);
 expect((await listAdminSales("",0,"seller-real")).sales[0]).toMatchObject({controlNumber:expect.stringMatching(/^CR-\d{7,}$/),creditOverride:{reason:body.creditOverrideReason,actor:"seller-real",standardCredit:30000,appliedCredit:60000}});
 await expect(db.exec("UPDATE oc_client_sale_credit_overrides SET reason='Otro motivo' ")).rejects.toThrow(/immutable/);
});
it("impide evadir porcentaje sin motivo o exceder el tope del cliente",async()=>{
 await expect(createSale(input(),"seller")).rejects.toThrow(/máximo/);
 for(const reason of ["", "abc", " ".repeat(5),"x".repeat(501),42])expect(()=>parseSale({...input(),creditOverrideReason:reason})).toThrow(/motivo/);
 await expect(createSale({...input("Condición especial"),credit:60001},"seller")).rejects.toThrow(/máximo/);
 await expect(createSale({...input("Condición especial"),credit:50000},"seller")).rejects.toThrow(/Vuelve a calcular/);
 expect((await db.query("SELECT count(*)::int AS n FROM oc_client_sales")).rows).toEqual([{n:0}]);
});
it("mantiene pie, costos protegidos y correo verificado; bloquea una deuda previa",async()=>{
 expect(await quoteSale({...base(),total:50000,creditOverrideReason:"Condición especial"})).toMatchObject({maximumCredit:49999,minimumDeposit:1});
 expect(await quoteSale({...base(),pricingPolicy:undefined,creditOverrideReason:"Condición especial"})).toMatchObject({maximumCredit:35000,minimumDeposit:40000});
 await db.exec('UPDATE oc_client_user SET "emailVerified"=false');await expect(quoteSale({...base(),creditOverrideReason:"Condición especial"})).rejects.toThrow(/verificar/);
 await db.exec('UPDATE oc_client_user SET "emailVerified"=true;UPDATE oc_client_credit_balances SET principal_outstanding=10000');await expect(quoteSale({...base(),creditOverrideReason:"Condición especial"})).rejects.toThrow(/pendiente/);
});
it("revalida el nivel al guardar y no cambia la categoría ni extiende sus cuotas",async()=>{
 await quoteSale({...base(),creditOverrideReason:"Condición especial"});await db.exec("UPDATE oc_client_user SET category='start'");
 await expect(createSale(input("Condición especial"),"seller")).rejects.toThrow(/máximo/);
 expect((await db.query("SELECT category FROM oc_client_user")).rows).toEqual([{category:"start"}]);
 await db.exec("UPDATE oc_client_user SET category='vip'");await expect(createSale({...input("Condición especial"),installmentCount:3},"seller")).rejects.toThrow(/cuotas/);
});
it("revierte toda la venta si falla guardar el motivo de excepción",async()=>{
 const before=(await db.query("SELECT last_number FROM oc_client_sale_control_counter")).rows;
 await db.exec("CREATE FUNCTION fail_override_qa() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'QA override failure'; END; $$ LANGUAGE plpgsql;CREATE TRIGGER fail_override_qa BEFORE INSERT ON oc_client_sale_credit_overrides FOR EACH ROW EXECUTE FUNCTION fail_override_qa();");
 try{await expect(createSale(input("Condición especial"),"seller")).rejects.toThrow(/QA override/);}finally{await db.exec("DROP TRIGGER fail_override_qa ON oc_client_sale_credit_overrides;DROP FUNCTION fail_override_qa();");}
 expect((await db.query("SELECT last_number FROM oc_client_sale_control_counter")).rows).toEqual(before);expect((await db.query("SELECT count(*)::int AS n FROM oc_client_sales")).rows).toEqual([{n:0}]);
 expect((await db.query("SELECT principal_outstanding FROM oc_client_credit_balances")).rows).toEqual([{principal_outstanding:0}]);
});
