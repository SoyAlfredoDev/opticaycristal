// @vitest-environment node
import {beforeAll,afterAll,expect,it,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {seedLegacyContractSettings} from "../../../tests/fixtures/legacy-contract-settings";
const state=vi.hoisted(()=>({pool:null as unknown}));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>name}));
import {saveSaleProduct,listSaleProducts,quoteSale,createSale,parseSale} from "./sales";
import {runSaleOperation} from "./operations";
import {getStoredCommitment} from "./commitments";
import {creditAgreementPdf} from "./credit-agreement-pdf";
import {PDFDocument} from "pdf-lib";
import {protectClientValue} from "./privacy";
const db=new PGlite();const conn={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};state.pool={query:conn.query,connect:async()=>conn};
let variableId="",fixedId="";
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",Buffer.alloc(32,9).toString("base64"));
 for(const name of ["001-customers","002-sales","003-audit","007-installments","010-payment-commitments","011-variable-product-cost","011-variable-product-cost"])await db.exec(await readFile(`sql/clients/${name}.sql`,"utf8"));
 await seedLegacyContractSettings(db);
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES('variable-qa','Cliente Prueba','qa@example.invalid','Cliente','Prueba',$1,'qa-variable-rut',$2,true)`,[protectClientValue("123456785","rut"),protectClientValue("+56911111111","whatsapp")]);
 variableId=await saveSaleProduct({name:"Lente óptico",protectedCost:null},"qa-owner");fixedId=await saveSaleProduct({name:"Lente fijo",protectedCost:20000},"qa-owner");
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
const base=()=>({customerId:"variable-qa",productId:variableId,quantity:1,total:45000});
it("conserva NULL como costo variable y registra la creación en auditoría",async()=>{
 expect((await listSaleProducts()).find(p=>p.id===variableId)).toMatchObject({name:"Lente óptico",protectedCost:null});
 expect((await db.query<{new_cost:number|null}>("SELECT new_cost FROM oc_client_product_changes WHERE product_id=$1",[variableId])).rows[0].new_cost).toBeNull();
});
it("exige costo positivo para la venta variable y protege el pie según la cantidad",async()=>{
 for(const cost of [undefined,null,0,-1,1.5,1000000001])await expect(quoteSale({...base(),...(cost!==undefined?{unitProtectedCost:cost}:{})})).rejects.toThrow(/Costo protegido/);
 expect(await quoteSale({...base(),unitProtectedCost:40000})).toMatchObject({maximumCredit:5000,minimumDeposit:40000,protectedCost:40000});
 expect(await quoteSale({...base(),quantity:2,total:100000,unitProtectedCost:40000})).toMatchObject({maximumCredit:20000,minimumDeposit:80000,protectedCost:80000});
});
it("impide reemplazar desde el navegador el costo de un producto fijo",async()=>{
 expect(await quoteSale({...base(),productId:fixedId,unitProtectedCost:1})).toMatchObject({protectedCost:20000,maximumCredit:13500});
});
it("guarda el costo de esta venta y lo conserva en reintentos y cambios del catálogo",async()=>{
 const input=parseSale({...base(),unitProtectedCost:40000,credit:5000,installmentCount:1,firstDueDate:"2030-01-02",identityChecked:true,depositReceived:true,requestKey:randomUUID()});
 const id=await createSale(input,"qa-staff");expect(await createSale(input,"qa-staff")).toBe(id);
 await expect(createSale({...input,unitProtectedCost:35000},"qa-staff")).rejects.toThrow(/otros datos/);
 await saveSaleProduct({id:variableId,name:"Lente óptico",protectedCost:25000},"qa-owner");
 expect((await db.query<{protected_cost:number}>("SELECT protected_cost FROM oc_client_sales WHERE id=$1",[id])).rows[0].protected_cost).toBe(40000);
});

it("registra las condiciones aceptadas, genera el compromiso y lo exporta sin modificar la operación",async()=>{
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES('wizard-qa','Cliente Demostración','wizard@example.invalid','Cliente','Demostración',$1,'wizard-unique',$2,true,'premium')`,[protectClientValue("123456785","rut"),protectClientValue("+56911111111","whatsapp")]);
 const quote=await quoteSale({customerId:"wizard-qa",productId:fixedId,quantity:1,total:200000});expect(quote).toMatchObject({maximumCredit:80000,maxInstallments:3});
 const raw={action:"create",customerId:"wizard-qa",productId:fixedId,quantity:1,total:200000,credit:80000,installmentCount:3,firstDueDate:"2030-01-02",identityChecked:true,depositReceived:true,conditionsReviewed:true,requestKey:randomUUID()};
 const id=await runSaleOperation(raw,"qa-staff");expect(await runSaleOperation(raw,"qa-staff")).toBe(id);const document=await getStoredCommitment(id,"wizard-qa");expect(document).toMatchObject({sale:{id,total:200000,deposit:120000,credit:80000}});expect(document!.installments).toHaveLength(3);expect(document!.installments.reduce((sum,i)=>sum+i.amount,0)).toBe(80000);
 const stored=(await db.query<{request_data:{conditionsReviewed:boolean}}>("SELECT request_data FROM oc_client_sales WHERE id=$1",[id])).rows[0];expect(stored.request_data.conditionsReviewed).toBe(true);const before=await db.query("SELECT remaining,request_data FROM oc_client_sales WHERE id=$1",[id]);expect((await PDFDocument.load(await creditAgreementPdf(document!))).getPageCount()).toBeGreaterThan(0);expect((await db.query("SELECT remaining,request_data FROM oc_client_sales WHERE id=$1",[id])).rows).toEqual(before.rows);
});
