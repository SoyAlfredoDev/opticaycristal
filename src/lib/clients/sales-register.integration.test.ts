// @vitest-environment node
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import {beforeAll,afterAll,expect,it,vi} from "vitest";
import type {Pool} from "pg";
const m=vi.hoisted(()=>({role:"administrator" as string|null,actor:"seller-a"}));
vi.mock("./db",()=>({clientPool:()=>pool,clientTable:(name:string)=>name}));
vi.mock("./admin",()=>({customerAdminSession:async()=>m.role?{u:m.actor,role:m.role}:null}));
import {createSale,parseSale} from "./sales";
import {listAdminSales,saleControlNumber} from "./sales-register";
import {GET} from "@/app/api/admin/clientes/ventas/historial/route";
import {POST} from "@/app/api/admin/clientes/ventas/[id]/control/route";
const db=new PGlite();const connection={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
const pool={query:connection.query,connect:async()=>connection} as unknown as Pool;
const origin="http://localhost:3034";let original="",second="";
const input=()=>parseSale({customerId:"client",productId:"product",total:45000,quantity:1,credit:0,installmentCount:0,firstDueDate:"",identityChecked:true,depositReceived:true,requestKey:randomUUID()});
const request=(requestOrigin=origin)=>new Request(origin+"/api/admin/clientes/ventas/sale/control",{method:"POST",headers:{Origin:requestOrigin,"Content-Type":"application/json"},body:JSON.stringify({controlNumber:"OTHER-1"})});
beforeAll(async()=>{
 vi.stubEnv("CLIENT_APP_URL",origin);for(const f of ["001-customers","002-sales","003-audit","030-sale-internal-controls","031-automatic-sale-controls","031-automatic-sale-controls"])await db.exec(await readFile(`sql/clients/${f}.sql`,"utf8"));
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher") VALUES('client','Cliente Ejemplo','qa@example.invalid','Cliente','Ejemplo','encrypted','hash','encrypted')`);
 await db.query("INSERT INTO oc_client_products(id,name,protected_cost,updated_by) VALUES('product','Lente óptico',15000,'seller-a')");
 original=await createSale(input(),"seller-a");second=await createSale(input(),"seller-b");
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
it("genera desde CR-0000001 y limita las ventas del vendedor desde el servidor",async()=>{
 expect(await saleControlNumber(original)).toBe("CR-0000001");expect(await saleControlNumber(second)).toBe("CR-0000002");
 expect((await listAdminSales("",0,"seller-a")).sales.map(s=>s.id)).toEqual([original]);expect((await listAdminSales("cr-0000001",0,null)).sales.map(s=>s.id)).toEqual([original]);
 expect(JSON.stringify(await listAdminSales("",0,null))).not.toMatch(/encrypted|rutHash|protected_cost|request_data/);
});
it("conserva el número al reintentar y registra al responsable una sola vez",async()=>{
 const body=input(),id=await createSale(body,"seller-a");expect(await createSale(body,"seller-a")).toBe(id);expect(await saleControlNumber(id)).toBe("CR-0000003");
 expect((await db.query("SELECT control_number,actor FROM oc_client_sale_control_changes WHERE sale_id=$1",[id])).rows).toEqual([{control_number:"CR-0000003",actor:"seller-a"}]);
});
it("rechaza elegir o modificar el control en la API y en la base",async()=>{
 expect(()=>parseSale({...input(),internalControl:"CR-0000999"})).toThrow(/automáticamente/);
 await expect(db.query("UPDATE oc_client_sale_controls SET control_number='OTHER-1' WHERE sale_id=$1",[original])).rejects.toThrow(/immutable/);
 await expect(db.query("DELETE FROM oc_client_sale_controls WHERE sale_id=$1",[original])).rejects.toThrow(/immutable/);
 await expect(db.query("UPDATE oc_client_sale_control_changes SET actor='other' WHERE sale_id=$1",[original])).rejects.toThrow(/immutable/);
 m.role=null;expect((await POST(request())).status).toBe(401);m.role="administrator";expect((await POST(request("https://externo.invalid"))).status).toBe(403);expect((await POST(request())).status).toBe(403);m.role="seller";expect((await POST(request())).status).toBe(403);m.role="administrator";
});
it("revierte venta y contador si falla la auditoría",async()=>{
 const before=(await db.query("SELECT last_number FROM oc_client_sale_control_counter")).rows;
 await db.exec("CREATE FUNCTION fail_control_qa() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'QA audit failure'; END; $$ LANGUAGE plpgsql;CREATE TRIGGER fail_control_qa BEFORE INSERT ON oc_client_sale_control_changes FOR EACH ROW EXECUTE FUNCTION fail_control_qa();");
 try{await expect(createSale(input(),"seller-a")).rejects.toThrow(/QA audit/);}finally{await db.exec("DROP TRIGGER fail_control_qa ON oc_client_sale_control_changes;DROP FUNCTION fail_control_qa();");}
 expect((await db.query("SELECT last_number FROM oc_client_sale_control_counter")).rows).toEqual(before);expect(await saleControlNumber(await createSale(input(),"seller-a"))).toBe("CR-0000004");
});
it("una migración repetida conserva contador y números anulados",async()=>{
 await db.query("UPDATE oc_client_sales SET status='cancelled' WHERE id=$1",[second]);await db.exec(await readFile("sql/clients/031-automatic-sale-controls.sql","utf8"));
 expect(await saleControlNumber(await createSale(input(),"seller-b"))).toBe("CR-0000005");expect((await listAdminSales("CR-0000002",0,null)).sales[0]).toMatchObject({status:"cancelled",controlNumber:"CR-0000002"});
});
it("pagina y protege el historial sin perder ventas",async()=>{
 for(let i=0;i<22;i++)await createSale(input(),"seller-b");const a=await listAdminSales("",0,null),b=await listAdminSales("",25,null);
 expect(a.sales).toHaveLength(25);expect(a.hasMore).toBe(true);expect(b.sales).toHaveLength(2);expect(new Set([...a.sales,...b.sales].map(s=>s.controlNumber)).size).toBe(27);
 m.role=null;expect((await GET(new Request(origin+"/api/admin/clientes/ventas/historial"))).status).toBe(401);m.role="seller";
 const own=await GET(new Request(origin+"/api/admin/clientes/ventas/historial"));expect(own.headers.get("cache-control")).toContain("no-store");expect((await own.json()).sales.every((s:{id:string})=>s.id!==second)).toBe(true);
 m.role="administrator";expect((await GET(new Request(origin+"/api/admin/clientes/ventas/historial?offset=-1"))).status).toBe(400);
});
it("no trunca la numeración cuando supera los siete dígitos",async()=>{
 await db.exec("UPDATE oc_client_sale_control_counter SET last_number=9999999");
 expect(await saleControlNumber(await createSale(input(),"seller-a"))).toBe("CR-10000000");
});
it("la migración preserva referencias históricas y continúa después del mayor CR",async()=>{
 const legacy=new PGlite();try{
  await legacy.exec("CREATE TABLE oc_client_sales(id text PRIMARY KEY,created_by text,created_at timestamptz DEFAULT now());INSERT INTO oc_client_sales(id) VALUES('old'),('other'),('new');");
  await legacy.exec(await readFile("sql/clients/030-sale-internal-controls.sql","utf8"));
  await legacy.exec("INSERT INTO oc_client_sale_controls(sale_id,control_number) VALUES('old','CR-0000042'),('other','OC-LEGACY');");
  await legacy.exec(await readFile("sql/clients/031-automatic-sale-controls.sql","utf8"));
  expect((await legacy.query("INSERT INTO oc_client_sale_controls(sale_id) VALUES('new') RETURNING control_number")).rows).toEqual([{control_number:"CR-0000043"}]);
  expect((await legacy.query("SELECT control_number FROM oc_client_sale_controls WHERE sale_id='other'")).rows).toEqual([{control_number:"OC-LEGACY"}]);
 }finally{await legacy.close();}
});
