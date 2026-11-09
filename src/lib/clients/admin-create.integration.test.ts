// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { ClientMail } from "./mail";

const mocks=vi.hoisted(()=>({role:"administrator" as string|null, send:vi.fn<(message:ClientMail)=>Promise<void>>().mockResolvedValue(undefined)}));
vi.mock("@/lib/auth",()=>({getSession:async ({allowSeller}:{allowSeller:boolean})=>
  !mocks.role||mocks.role==="seller"&&!allowSeller?null:{u:"qa-"+mocks.role,role:mocks.role,staffId:"qa-staff"}}));
vi.mock("./db",async original=>({...await original<typeof import("./db")>(),clientPool:()=>pool}));
vi.mock("./mail",async original=>({...await original<typeof import("./mail")>(),sendClientMail:mocks.send}));

import { createClientAuth } from "./auth";
import { POST } from "@/app/api/admin/clientes/crear/route";

const db=new PGlite();
const connection={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
const pool={connect:async()=>connection,query:connection.query} as unknown as Pool;
const base="http://localhost:3097";
const input=(rut:string,email:string)=>({firstName:"Cliente",lastName:"Prueba",rut,whatsapp:"+56900000001",email,privacyAccepted:true});
const create=(body:unknown, origin=base)=>POST(new Request(base+"/api/admin/clientes/crear",{
  method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body),
}));
beforeAll(async()=>{
  vi.stubEnv("CLIENT_DATABASE_SCHEMA","public");
  vi.stubEnv("CLIENT_AUTH_SECRET",randomBytes(32).toString("base64"));
  vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));
  vi.stubEnv("CLIENT_APP_URL",base);
  for(const file of ["001-customers.sql","012-customer-profile-edits.sql"])await db.exec(await readFile("sql/clients/"+file,"utf8"));
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});

it.each([["administrator","12345678-5"],["seller","7654321-6"]])(
  "%s guarda la ficha sin verificar contactos y envía un enlace de acceso de un solo uso",
  async(role,rut)=>{
    mocks.role=role;
    const email=role+"@example.com";
    const r=await create(input(rut,email));
    const result=await r.json();
    expect(r.status,result.error).toBe(200);
    expect(result).toEqual({customerId:expect.any(String),created:true,invitationSent:true});
    expect((await db.query('SELECT "emailVerified","whatsappVerified",category FROM oc_client_user WHERE id=$1',[result.customerId])).rows)
      .toEqual([{emailVerified:false,whatsappVerified:false,category:"start"}]);
    const mail=mocks.send.mock.lastCall?.[0];
    expect(mail).toMatchObject({to:email,kind:"setup"});
    const url=new URL(mail!.url);
    expect(url.origin).toBe(base);
    expect(url.searchParams.get("callbackURL")).toContain("/mi-cuenta/restablecer");
    const token=url.pathname.split("/").at(-1)!;
    const auth=createClientAuth(pool);
    const body={token,newPassword:"Synthetic access password 2026!"};
    await expect(auth.api.resetPassword({body})).resolves.toMatchObject({status:true});
    await expect(auth.api.resetPassword({body})).rejects.toThrow();
    expect((await db.query('SELECT "emailVerified","whatsappVerified" FROM oc_client_user WHERE id=$1',[result.customerId])).rows)
      .toEqual([{emailVerified:false,whatsappVerified:false}]);
    const sent=mocks.send.mock.calls.length;
    const duplicate=await create(input(rut,"changed@example.com"));
    expect(await duplicate.json()).toEqual({customerId:result.customerId,created:false,invitationSent:false});
    expect(mocks.send).toHaveBeenCalledTimes(sent);
    expect((await db.query("SELECT email FROM oc_client_user WHERE id=$1",[result.customerId])).rows).toEqual([{email}]);
  },20000,
);
it("rechaza sin sesión, origen cruzado y cambios de verificación inyectados",async()=>{
  const body=input("11111111-1","deny@example.com");
  mocks.role=null;
  expect((await create(body)).status).toBe(401);
  mocks.role="seller";
  expect((await create(body,"https://example.com")).status).toBe(403);
  expect((await create({...body,emailVerified:true})).status).toBe(400);
});
