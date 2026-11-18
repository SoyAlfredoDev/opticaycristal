// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { ClientMail } from "./mail";

const mocks=vi.hoisted(()=>({role:"administrator" as string|null, code:vi.fn<(email:string,code:string,id:string)=>Promise<void>>().mockResolvedValue(undefined), send:vi.fn<(message:ClientMail)=>Promise<void>>().mockResolvedValue(undefined)}));
vi.mock("@/lib/auth",()=>({getSession:async ({allowSeller}:{allowSeller:boolean})=>
  !mocks.role||mocks.role==="seller"&&!allowSeller?null:{u:"qa-"+mocks.role,role:mocks.role,staffId:"qa-staff"}}));
vi.mock("./db",async original=>({...await original<typeof import("./db")>(),clientPool:()=>pool}));
vi.mock("./mail",async original=>({...await original<typeof import("./mail")>(),sendClientMail:mocks.send,sendStaffVerificationCode:mocks.code}));

import { createClientAuth } from "./auth";
import { POST } from "@/app/api/admin/clientes/crear/route";
import { POST as salesAction } from "@/app/api/admin/clientes/ventas/route";
import { POST as salesRegistration } from "@/app/api/admin/clientes/ventas/alta/route";
import { POST as changeEmail } from "@/app/api/admin/clientes/[id]/cambiar-correo/route";
import { parseCustomerDocument } from "./customer-document";
import { findCustomerByDocument, readCustomerDocument } from "./customer-document-store";
import { clientFingerprint, protectClientValue } from "./privacy";

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
  for(const file of ["001-customers.sql","002-sales.sql","003-audit.sql","012-customer-profile-edits.sql","029-staff-contact-challenges.sql"])await db.exec(await readFile("sql/clients/"+file,"utf8"));
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


function request(path:string,body:unknown,origin=base){
    return new Request(base+path,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
}

it("valida el correo del alta de venta antes de crear la ficha y deja el WhatsApp pendiente",async()=>{
    const path="/api/admin/clientes/ventas/alta";
    const contact=input("22345678-2","sale-customer@example.com");
    mocks.role="seller";
    const send=await salesRegistration(request(path,{...contact,action:"send"}));
    expect(send.status,await send.clone().text()).toBe(200);
    const {requestId}=await send.json(), [email,code]=mocks.code.mock.lastCall!;
    expect(email).toBe(contact.email);
    const createBody={...contact,action:"create",requestId,code};
    expect((await salesRegistration(request(path,{...createBody,code:code==="0000"?"1111":"0000"}))).status).toBe(400);
    expect((await salesRegistration(request(path,{...createBody,email:"wrong-mail@example.com"}))).status).toBe(400);
    expect((await db.query("SELECT id FROM oc_client_user WHERE email=$1",[email])).rows).toHaveLength(0);
    mocks.role="administrator";
    expect((await salesRegistration(request(path,createBody))).status).toBe(400);
    mocks.role="seller";
    const verified=await salesRegistration(request(path,createBody));
    expect(verified.status,await verified.clone().text()).toBe(200);
    const {customerId}=await verified.json();
    const row=(await db.query('SELECT email,"emailVerified","whatsappVerified",category FROM oc_client_user WHERE id=$1',[customerId])).rows[0];
    expect(row).toEqual({email,"emailVerified":true,"whatsappVerified":false,category:"start"});
    expect(mocks.send.mock.lastCall?.[0]).toMatchObject({to:email,kind:"setup"});
    const url=new URL(mocks.send.mock.lastCall![0].url);
    const token=url.pathname.split("/").at(-1)!;
    const auth=createClientAuth(pool),password="Test only password 27!";
    await expect(auth.api.resetPassword({body:{token,newPassword:password}})).resolves.toMatchObject({status:true});
    await expect(auth.api.signInEmail({body:{email,password}})).resolves.toMatchObject({user:{id:customerId}});
    expect((await db.query("SELECT * FROM oc_client_staff_contact_challenges")).rows).toHaveLength(0);
    expect((await db.query('SELECT id FROM oc_client_user WHERE "rutHash"=$1',[clientFingerprint("223456782","rut")])).rows).toHaveLength(1);
},20000);

it("solo el administrador puede cambiar el acceso, con código nuevo, y se revoca el enlace de recuperación anterior",async()=>{
    const oldEmail="original-sale-login@example.com",email="new-sale-login@example.com";
    const transport=vi.fn<(message:ClientMail)=>Promise<void>>().mockResolvedValue(undefined);
    const auth=createClientAuth(pool,transport);
    const password="Test only password 27!";
    const {user:{id}}=await auth.api.signUpEmail({body:{name:"Cliente Prueba",email:oldEmail,password,
        firstName:"Cliente",lastName:"Prueba",rutHash:"replacement-synthetic",
        rutCipher:protectClientValue("223456782","rut"),whatsappCipher:protectClientValue("+56900000002","whatsapp")}});
    await db.query('UPDATE oc_client_user SET "emailVerified"=true WHERE id=$1',[id]);
    await auth.api.signInEmail({body:{email:oldEmail,password}});
    const path="/api/admin/clientes/"+id+"/cambiar-correo";
    const ctx={params:Promise.resolve({id})};
    await auth.api.requestPasswordReset({body:{email:oldEmail,redirectTo:"/mi-cuenta/restablecer"}});
    const oldToken=new URL(transport.mock.lastCall![0].url).pathname.split("/").at(-1)!;
    mocks.role="seller";
    expect((await changeEmail(request(path,{action:"send",email}),ctx)).status).toBe(403);
    mocks.role="administrator";
    expect((await changeEmail(request(path,{action:"send",email},"https://example.com"),ctx)).status).toBe(403);
    const send=await changeEmail(request(path,{action:"send",email}),ctx);
    expect(send.status,await send.clone().text()).toBe(200);
    const {requestId}=await send.json();
    const [,code]=mocks.code.mock.lastCall!;
    expect((await db.query("SELECT email FROM oc_client_user WHERE id=$1",[id])).rows[0]).toEqual({email:oldEmail});
    mocks.role="seller";
    expect((await changeEmail(request(path,{action:"confirm",email,requestId,code}),ctx)).status).toBe(403);
    mocks.role="administrator";
    const confirmed=await changeEmail(request(path,{action:"confirm",email,requestId,code}),ctx);
    expect(confirmed.status,await confirmed.clone().text()).toBe(200);
    expect(await confirmed.json()).toMatchObject({customer:{id,email,emailVerified:true}});
    expect((await db.query('SELECT id FROM oc_client_session WHERE "userId"=$1',[id])).rows).toHaveLength(0);
    await expect(auth.api.resetPassword({body:{token:oldToken,newPassword:"Another synthetic password 2026!"}})).rejects.toThrow();
    await expect(auth.api.signInEmail({body:{email:oldEmail,password}})).rejects.toThrow();
    await expect(auth.api.signInEmail({body:{email,password}})).resolves.toMatchObject({user:{id}});
    expect((await db.query("SELECT email FROM oc_client_email_reservations WHERE customer_id=$1",[id])).rows).toEqual([{email:oldEmail}]);
});

it("rechaza RUT inválidos sin enviar y reutiliza un pasaporte con el mismo emisor, aunque cambie el formato", async () => {
    mocks.role="seller";
    const path="/api/admin/clientes/ventas/alta";
    const mailCount=mocks.code.mock.calls.length;
    const invalid=await salesRegistration(request(path,{...input("12345678-9","wrong-dv@example.invalid"),action:"send"}));
    expect(invalid.status).toBe(400);
    expect(mocks.code).toHaveBeenCalledTimes(mailCount);

    const contact=input("", "passport-a@example.invalid");
    const passport={documentType:"passport",documentCountry:"PE",documentNumber:"Ab-123 456"};
    const issued=await salesRegistration(request(path,{...contact,...passport,action:"send"}));
    expect(issued.status).toBe(200);
    const {requestId}=await issued.json();
    const [,code]=mocks.code.mock.lastCall!;
    const createBody={...contact,...passport,action:"create",requestId,code};
    expect((await salesRegistration(request(path,{...createBody,documentCountry:"AR"}))).status).toBe(400);
    const registration=await salesRegistration(request(path,createBody));
    expect(registration.status).toBe(200);
    const {customerId}=await registration.json();
    const {rows:[row]}=await db.query<{rutCipher:string;emailVerified:boolean}>(`SELECT "rutCipher","emailVerified" FROM oc_client_user WHERE id=$1`,[customerId]);
    expect(row.emailVerified).toBe(true);
    expect(row.rutCipher).not.toContain("AB123456");
    expect(readCustomerDocument(row.rutCipher)).toEqual({rut:"",document:{type:"passport",country:"PE",number:"AB123456"}});

    const duplicate={...contact,...passport,documentNumber:"AB123456",documentCountry:"pe",email:"other@example.invalid"};
    const existing=await salesRegistration(request(path,{...duplicate,action:"send"}));
    expect(await existing.json()).toEqual({customerId,created:false,invitationSent:false});
    const fromClients=await create(duplicate);
    expect(await fromClients.json()).toEqual({customerId,created:false,invitationSent:false});
    expect(mocks.code).toHaveBeenCalledTimes(mailCount+1);
    expect(await findCustomerByDocument(parseCustomerDocument(duplicate))).toBe(customerId);
    const lookup=await salesAction(request("/api/admin/clientes/ventas",{...passport,action:"lookup"}));
    expect(await lookup.json()).toMatchObject({customer:{id:customerId,rut:"",document:{type:"passport",country:"PE",number:"AB123456"},purchaseCount:0}});
    const check=await salesAction(request("/api/admin/clientes/ventas",{...passport,action:"check-document"}));
    expect(await check.json()).toEqual({customerId});
    expect(await findCustomerByDocument(parseCustomerDocument({...duplicate,documentType:"national_id"}))).toBeNull();
    expect(await findCustomerByDocument(parseCustomerDocument({...duplicate,documentCountry:"AR"}))).toBeNull();
    const sameNumberAnotherCountry=await create({...duplicate,documentCountry:"AR"});
    const other=await sameNumberAnotherCountry.json();
    expect(other).toMatchObject({created:true,customerId:expect.any(String)});
    expect(other.customerId).not.toBe(customerId);
    const national=await create({...duplicate,documentType:"national_id",email:"national-id@example.invalid"});
    expect(await national.json()).toMatchObject({created:true});

});
