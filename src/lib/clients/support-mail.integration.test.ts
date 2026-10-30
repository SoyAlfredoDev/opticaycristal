// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const state=vi.hoisted(()=>({pool:null as unknown,failMark:false,send:vi.fn(),configured:true}));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock("@/lib/mail/resend",()=>({enviarConResend:state.send,resendConfigured:()=>state.configured}));
import { createSupportTicket,getSupportTicket,updateSupportTicket } from "./support";
import { drainSupportMail } from "./support-mail";
import { revealClientValue } from "./privacy";
const db=new PGlite(),alice={kind:"customer",id:"alice"} as const,staff={kind:"admin",id:"staff"} as const;
const conn={query:async(sql:string,values?:unknown[])=>{if(state.failMark&&sql.includes("state='sent'")){state.failMark=false;throw Error("Fallo aislado al guardar confirmación");}const r=await db.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
const make=()=>createSupportTicket(alice,{subject:"Detalle privado del cliente",message:"Texto privado que no debe viajar por correo",requestKey:randomUUID(),notificationEmail:"intruso@example.com"});
const job=async()=> (await db.query<{state:string;payload_cipher:string;attempts:number;provider_id:string;failure_code:string}>("SELECT * FROM oc_client_support_mail ORDER BY created_at DESC")).rows[0];
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_SUPPORT_EMAIL","opticaycristal.cl@gmail.com");
 for(const file of ["001-customers.sql","004-support.sql","005-support-mail.sql","005-support-mail.sql"])await db.exec(await readFile(`sql/clients/${file}`,"utf8"));
 await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified") VALUES('alice','Cliente Prueba','alice@example.com','Cliente','Prueba','encrypted','unique','encrypted',true)`);
},30000);
beforeEach(async()=>{await db.exec("TRUNCATE oc_client_support_tickets CASCADE; UPDATE oc_client_user SET email='alice@example.com',\"emailVerified\"=true;");state.failMark=false;state.configured=true;state.send.mockReset();state.send.mockResolvedValue({ok:true,id:"provider-test",error:null});});
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential("Avisos de soporte: cola transaccional y proveedor aislado",()=>{
 it("registra un aviso al equipo con destinatario del servidor, cifrado y sin texto privado",async()=>{
  const ticket=await make(),queued=await job();expect(queued.state).toBe("pending");expect(queued.payload_cipher).not.toContain("gmail.com");
  const payload=JSON.parse(revealClientValue(queued.payload_cipher,"support-email"));expect(payload.to).toBe("opticaycristal.cl@gmail.com");expect(payload.text).not.toContain("Texto privado");expect(payload.html).not.toContain("Detalle privado");expect(payload.html).toContain("cid:logo-opticaycristal");expect(payload.html).toContain(`?ticket=${ticket.id}`);expect(payload.html).not.toContain("undefined");
 });
 it("avisa solo al crear y responder el personal; reintentos y cierres no duplican avisos",async()=>{
  const input={subject:"Ayuda",message:"Mensaje",requestKey:randomUUID()},t=await createSupportTicket(alice,input);await createSupportTicket(alice,input);
  const reply={action:"reply",message:"Respuesta",requestKey:randomUUID()};await updateSupportTicket(staff,t.id,reply);await updateSupportTicket(staff,t.id,reply);
  const last=await updateSupportTicket(alice,t.id,{action:"reply",message:"Gracias",requestKey:randomUUID()});await updateSupportTicket(staff,t.id,{action:"resolve",lastMessageId:last.messages.at(-1)?.id,requestKey:randomUUID()});
  expect((await db.query("SELECT kind FROM oc_client_support_mail ORDER BY created_at")).rows).toEqual([{kind:"ticket_created"},{kind:"staff_reply"}]);
 });
 it("envía una sola vez y guarda referencia del proveedor",async()=>{
  const t=await make();expect(await drainSupportMail({ticketId:t.id})).toEqual({sent:1});expect(await drainSupportMail({ticketId:t.id})).toEqual({sent:0});expect(state.send).toHaveBeenCalledTimes(1);expect(await job()).toMatchObject({state:"sent",attempts:1,provider_id:"provider-test"});
 });
 it("no bloquea el ticket si el proveedor falla y conserva el mismo envío en los reintentos",async()=>{
  const t=await make();state.send.mockResolvedValue({ok:false,id:null,error:"timeout"});const delay=vi.fn(async()=>{});
  expect(await drainSupportMail({ticketId:t.id},{delay})).toEqual({sent:0});expect(delay.mock.calls).toHaveLength(2);expect(await job()).toMatchObject({state:"pending",attempts:3});
  expect((await getSupportTicket(alice,t.id)).messages).toHaveLength(1);expect(new Set(state.send.mock.calls.map(([mail])=>mail.idempotencyKey)).size).toBe(1);
  await db.exec("UPDATE oc_client_support_mail SET next_attempt_at=now()-interval '1 minute'");state.send.mockResolvedValue({ok:true,id:"recovered",error:null});await drainSupportMail({ticketId:t.id});expect(await job()).toMatchObject({state:"sent",provider_id:"recovered"});
 });
 it("dos procesadores simultáneos no envían el mismo aviso",async()=>{
  const t=await make();const results=await Promise.all([drainSupportMail({ticketId:t.id}),drainSupportMail({ticketId:t.id})]);expect(results.reduce((n,r)=>n+r.sent,0)).toBe(1);expect(state.send).toHaveBeenCalledTimes(1);
 });
 it("recupera confirmaciones interrumpidas con igual payload y clave idempotente",async()=>{
  const t=await make();state.failMark=true;await expect(drainSupportMail({ticketId:t.id})).rejects.toThrow("confirmación");
  await db.exec("UPDATE oc_client_support_mail SET lease_until=now()-interval '1 minute'");await drainSupportMail({ticketId:t.id});expect(state.send).toHaveBeenCalledTimes(2);expect(state.send.mock.calls[0][0]).toEqual(state.send.mock.calls[1][0]);expect(await job()).toMatchObject({state:"sent"});
 });
 it("prioriza el aviso de la respuesta actual aunque haya otros avisos pendientes",async()=>{
  const t=await make(),requestKey=randomUUID();await updateSupportTicket(staff,t.id,{action:"reply",message:"Le ayudamos",requestKey});await drainSupportMail({ticketId:t.id,requestKey});
  expect(state.send.mock.calls[0][0].to).toBe("alice@example.com");expect(state.send.mock.calls[0][0].subject).toContain("Respuesta a su ticket");
 });
 it("espera la verificación del correo para avisar al cliente",async()=>{
  const t=await make();await drainSupportMail({ticketId:t.id});state.send.mockClear();await db.exec("UPDATE oc_client_user SET \"emailVerified\"=false");
  await updateSupportTicket(staff,t.id,{action:"reply",message:"Le ayudamos",requestKey:randomUUID()});expect(await job()).toMatchObject({state:"unverified"});expect(await drainSupportMail({ticketId:t.id})).toEqual({sent:0});expect(state.send).not.toHaveBeenCalled();
  await db.exec("UPDATE oc_client_user SET \"emailVerified\"=true");await drainSupportMail({ticketId:t.id});expect(state.send).toHaveBeenCalledTimes(1);expect(state.send.mock.calls[0][0].to).toBe("alice@example.com");
 });
 it("no envía a una dirección anterior si el cliente cambió su correo",async()=>{
  const t=await make();await drainSupportMail({ticketId:t.id});state.send.mockClear();await updateSupportTicket(staff,t.id,{action:"reply",message:"Respuesta",requestKey:randomUUID()});await db.exec("UPDATE oc_client_user SET email='changed@example.com'");await drainSupportMail({ticketId:t.id});expect(state.send).not.toHaveBeenCalled();expect(await job()).toMatchObject({state:"failed",failure_code:"address_changed"});
 });
 it("no reenvía fuera de la ventana idempotente ni insiste ante rechazos permanentes",async()=>{
  const t=await make();await db.exec("UPDATE oc_client_support_mail SET first_attempt_at=now()-interval '25 hours',attempts=1");await drainSupportMail({ticketId:t.id});expect(state.send).not.toHaveBeenCalled();expect(await job()).toMatchObject({state:"failed",failure_code:"review_required"});
  const another=await make();state.send.mockResolvedValue({ok:false,id:null,error:"rejected",httpStatus:403});await drainSupportMail({ticketId:another.id});expect(state.send).toHaveBeenCalledTimes(1);expect(await job()).toMatchObject({state:"failed",failure_code:"provider_rejected"});
 });
 it("conserva pendientes cuando no está configurado el proveedor",async()=>{
  const t=await make();state.configured=false;expect(await drainSupportMail({ticketId:t.id})).toEqual({sent:0});expect(state.send).not.toHaveBeenCalled();expect(await job()).toMatchObject({state:"pending",attempts:0});
 });
});
