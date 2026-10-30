// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Pool } from "pg";
const state=vi.hoisted(()=>({auth:null as unknown}));
vi.mock("@/lib/clients/auth",async original=>({...await original<typeof import("@/lib/clients/auth")>(),clientAuth:()=>state.auth}));
vi.mock("./db",async original=>({...await original<typeof import("./db")>(),clientPool:()=>pool}));
import { createClientAuth } from "@/lib/clients/auth";
import { POST } from "@/app/api/clientes/registro/route";
const db=new PGlite();
const connection={query:async(sql:string,values?:unknown[])=>{const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
const pool={connect:async()=>connection,query:connection.query} as unknown as Pool;
const base="http://localhost:3097";
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATABASE_SCHEMA","public");vi.stubEnv("CLIENT_AUTH_SECRET",randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_APP_URL",base);
 await db.exec(await readFile("sql/clients/001-customers.sql","utf8"));state.auth=createClientAuth(pool,async()=>{});
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
function register(email:string){return POST(new Request(base+"/api/clientes/registro",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({firstName:"Auditoría",lastName:"QA",rut:"12345678-5",whatsapp:"+56900000001",email,password:"Synthetic audit password 2026!",privacyAccepted:true})}));}
it("responde igual a RUT nuevo y duplicado sin crear dos cuentas",async()=>{
 const fresh=await register("audit-new@example.com");
 const duplicate=await register("audit-other@example.com");
 expect(fresh.status).toBe(200);expect(duplicate.status).toBe(200);const freshBody=await fresh.json();expect(freshBody).toEqual(await duplicate.json());expect(freshBody.welcome).toEqual({tierName:"Start",maxAmount:40000,maxPercent:30,maxInstallments:1});
 expect((await db.query("SELECT count(*)::int AS count FROM oc_client_user")).rows[0]).toEqual({count:1});
},20000);
