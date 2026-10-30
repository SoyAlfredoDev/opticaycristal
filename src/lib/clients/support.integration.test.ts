// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const state=vi.hoisted(()=>({pool:null as unknown,customer:"alice" as string|null,admin:false}));
vi.mock("./db",()=>({clientPool:()=>state.pool,clientTable:(name:string)=>`"${name}"`}));
vi.mock("./auth",()=>({customerSession:async()=>state.customer?{user:{id:state.customer}}:null}));
vi.mock("./admin",()=>({customerAdminSession:async()=>state.admin?{u:"staff"}:null}));
import { createSupportTicket, getSupportTicket, listSupportTickets, updateSupportTicket, type SupportActor } from "./support";
import { protectClientValue } from "./privacy";
import { supportCollection, supportConversation } from "./support-http";
const db=new PGlite();
const conn={query:async(sql:string,values?:unknown[])=>{const result=await db.query(sql,values);return {...result,rowCount:result.affectedRows??result.rows.length};},release(){}};
state.pool={query:conn.query,connect:async()=>conn};
const alice:SupportActor={kind:"customer",id:"alice"},bob:SupportActor={kind:"customer",id:"bob"},staff:SupportActor={kind:"admin",id:"staff"};
const input=()=>({subject:"Ayuda con mi cuenta",message:"Mi consulta privada <script>alert(1)</script>",requestKey:randomUUID()});
const request=(body:unknown,origin="https://opticaycristal.cl")=>new Request("https://opticaycristal.cl/api/clientes/soporte",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeAll(async()=>{
 vi.stubEnv("CLIENT_DATA_KEY",randomBytes(32).toString("base64"));vi.stubEnv("CLIENT_APP_URL","https://opticaycristal.cl");
 await db.exec(await readFile("sql/clients/001-customers.sql","utf8"));
 await db.exec(await readFile("sql/clients/004-support.sql","utf8"));
 await db.exec(await readFile("sql/clients/004-support.sql","utf8"));
 for(const id of ["alice","bob","unverified","limited"]){await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES($1,$1,$2,'Cliente','Prueba','encrypted',$1,'encrypted',false,'start')`,[id,`${id}@example.com`]);}
},30000);
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});
describe.sequential("Soporte: PostgreSQL y API sin datos reales",()=>{
 it("guarda asunto y conversación cifrados, sin exponer claves o autor administrativo",async()=>{
  const body=input(),ticket=await createSupportTicket(alice,body);
  expect(ticket).toMatchObject({subject:body.subject,status:"abierto",messages:[{role:"customer",body:body.message}]});expect(ticket.folio).toMatch(/^AYU-\d+$/);
  const stored=await db.query("SELECT subject_cipher,body_cipher FROM oc_client_support_tickets t JOIN oc_client_support_messages m ON m.ticket_id=t.id WHERE t.id=$1",[ticket.id]);
  expect(JSON.stringify(stored.rows)).not.toContain(body.subject);expect(JSON.stringify(stored.rows)).not.toContain("script");expect(JSON.stringify(ticket)).not.toMatch(/cipher|request_key|author_id|customer_id/);
 });
 it("aísla lista, conversación, respuestas y cierre por propietario",async()=>{
  const ticket=(await listSupportTickets(alice)).tickets[0];expect((await listSupportTickets(bob)).tickets).toEqual([]);
  await expect(getSupportTicket(bob,ticket.id)).rejects.toMatchObject({status:404});
  await expect(updateSupportTicket(bob,ticket.id,{action:"reply",message:"Intento ajeno",requestKey:randomUUID()})).rejects.toMatchObject({status:404});
  await expect(updateSupportTicket(bob,ticket.id,{action:"resolve",requestKey:randomUUID()})).rejects.toMatchObject({status:404});
  await expect(getSupportTicket(bob,randomUUID())).rejects.toMatchObject({status:404});
 });
 it("permite soporte antes de verificar correo y no duplica reintentos",async()=>{
  const user:SupportActor={kind:"customer",id:"unverified"},body=input();const first=await createSupportTicket(user,body);
  expect((await createSupportTicket(user,body)).id).toBe(first.id);expect((await listSupportTickets(user)).tickets).toHaveLength(1);
  await expect(createSupportTicket(user,{...body,subject:"Otra consulta"})).rejects.toMatchObject({status:409});
 });
 it("valida tamaños, UUID, estado y paginación y no permite crear como administrador",async()=>{
  for(const body of [null,[],{...input(),subject:" "},{...input(),subject:"x".repeat(101)},{...input(),message:"x".repeat(2001)},{...input(),requestKey:"not-uuid"}])await expect(createSupportTicket(alice,body)).rejects.toThrow();
  await expect(createSupportTicket(staff,input())).rejects.toMatchObject({status:403});
  await expect(listSupportTickets(staff,{status:"inexistente"})).rejects.toThrow();await expect(listSupportTickets(staff,{offset:-1})).rejects.toThrow();
 });
 it("completa cliente → administrador → cliente → resuelto → reabierto y conserva historial",async()=>{
  const first=await createSupportTicket(alice,{...input(),subject:"Ciclo de atención"});
  const body={action:"reply",message:"Te ayudamos desde la óptica.",requestKey:randomUUID()};
  const answered=await updateSupportTicket(staff,first.id,body);expect(answered.status).toBe("respondido");expect(answered.customer?.email).toBe("alice@example.com");
  expect((await updateSupportTicket(staff,first.id,body)).messages).toHaveLength(2);
  await expect(updateSupportTicket(staff,first.id,{...body,message:"Distinto"})).rejects.toMatchObject({status:409});
  const reply=await updateSupportTicket(alice,first.id,{action:"reply",message:"Muchas gracias",requestKey:randomUUID()});expect(reply.status).toBe("abierto");
  await expect(updateSupportTicket(staff,first.id,{action:"resolve",lastMessageId:answered.messages.at(-1)?.id,requestKey:randomUUID()})).rejects.toMatchObject({status:409});
  const resolved=await updateSupportTicket(staff,first.id,{action:"resolve",lastMessageId:reply.messages.at(-1)?.id,requestKey:randomUUID()});expect(resolved.status).toBe("resuelto");
  expect((await getSupportTicket(alice,first.id)).customer).toBeUndefined();
  const reopened=await updateSupportTicket(alice,first.id,{action:"reply",message:"Una duda más",requestKey:randomUUID()});expect(reopened.status).toBe("abierto");expect(reopened.messages).toHaveLength(5);
 });
 it("permite resolver al cliente y registra la acción en la conversación",async()=>{
  const t=(await listSupportTickets(alice)).tickets[0],detail=await getSupportTicket(alice,t.id);
  const resolved=await updateSupportTicket(alice,t.id,{action:"resolve",lastMessageId:detail.messages.at(-1)?.id,requestKey:randomUUID()});expect(resolved.status).toBe("resuelto");expect(resolved.messages.at(-1)).toMatchObject({role:"customer",body:"Ticket marcado como resuelto."});
 });
 it("aplica filtros de estado y búsqueda de cliente/folio solo al administrador",async()=>{
  const all=await listSupportTickets(staff);expect(all.tickets.length).toBeGreaterThan(1);
  const filtered=await listSupportTickets(staff,{q:"unverified@example.com"});expect(filtered.tickets).toHaveLength(1);
  expect((await listSupportTickets(staff,{q:filtered.tickets[0].folio})).tickets[0].id).toBe(filtered.tickets[0].id);
  expect((await listSupportTickets(staff,{status:"resuelto"})).tickets.every(t=>t.status==="resuelto")).toBe(true);
 });
 it("limita nuevas solicitudes por hora sin duplicar mensajes",async()=>{
  const user:SupportActor={kind:"customer",id:"limited"};for(let n=0;n<5;n++)await createSupportTicket(user,input());
  await expect(createSupportTicket(user,input())).rejects.toMatchObject({status:429});expect((await listSupportTickets(user)).tickets).toHaveLength(5);
 });
 it("API exige sesión y origen válido y no acepta elevar permisos o cambiar cliente",async()=>{
  const collection=supportCollection(false);state.customer=null;expect((await collection.GET(new Request("https://opticaycristal.cl/api/clientes/soporte"))).status).toBe(401);
  state.customer="bob";expect((await collection.POST(request(input(),"https://example.com"))).status).toBe(403);
  expect((await supportCollection(true).GET(new Request("https://opticaycristal.cl/api/admin/clientes/soporte"))).status).toBe(401);
  const created=await collection.POST(request({...input(),customerId:"alice",actor_kind:"admin"}));expect(created.status).toBe(201);expect(created.headers.get("cache-control")).toContain("no-store");
  const {ticket}=await created.json();expect((await listSupportTickets(bob)).tickets.some(t=>t.id===ticket.id)).toBe(true);expect(ticket.messages[0].role).toBe("customer");
  state.customer="alice";expect((await supportConversation(false).GET(new Request("https://opticaycristal.cl"),{params:Promise.resolve({id:ticket.id})})).status).toBe(404);
  state.admin=true;const reply=await supportConversation(true).POST(request({action:"reply",message:"Respuesta administrativa",requestKey:randomUUID()}),{params:Promise.resolve({id:ticket.id})});expect(reply.status).toBe(200);expect((await reply.json()).ticket.status).toBe("respondido");
 });
 it("revierte la creación completa si falla el primer mensaje",async()=>{
  const before=await db.query("SELECT count(*) FROM oc_client_support_tickets");
  await db.exec(`CREATE FUNCTION qa_reject_support() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Fallo aislado'; END; $$ LANGUAGE plpgsql; CREATE TRIGGER qa_reject_support BEFORE INSERT ON oc_client_support_messages FOR EACH ROW EXECUTE FUNCTION qa_reject_support();`);
  try{await expect(createSupportTicket(alice,input())).rejects.toThrow("Fallo aislado");}finally{await db.exec("DROP TRIGGER qa_reject_support ON oc_client_support_messages; DROP FUNCTION qa_reject_support();");}
  expect((await db.query("SELECT count(*) FROM oc_client_support_tickets")).rows).toEqual(before.rows);
 });
 it("limita mensajes por hora y mantiene el ticket sin cambios al rechazar",async()=>{
  const first=(await listSupportTickets(bob)).tickets[0],before=await getSupportTicket(bob,first.id);
  for(let n=0;n<19;n++)await db.query(`INSERT INTO oc_client_support_messages(id,ticket_id,actor_kind,author_id,body_cipher,request_key) VALUES($1,$2,'customer','bob',$3,$4)`,[randomUUID(),first.id,protectClientValue("Mensaje sintético","support-message"),randomUUID()]);
  await expect(updateSupportTicket(bob,first.id,{action:"reply",message:"Supera el límite",requestKey:randomUUID()})).rejects.toMatchObject({status:429});
  expect((await getSupportTicket(bob,first.id)).status).toBe(before.status);
 });
 it("pagina la lista real sin perder ni repetir tickets",async()=>{
  for(let n=0;n<51;n++)await db.query(`INSERT INTO oc_client_support_tickets(id,customer_id,subject_cipher,request_key) VALUES($1,'unverified',$2,$3)`,[randomUUID(),protectClientValue(`Historial ${n}`,"support-subject"),randomUUID()]);
  const first=await listSupportTickets({kind:"customer",id:"unverified"}),last=await listSupportTickets({kind:"customer",id:"unverified"},{offset:50});
  expect(first.tickets).toHaveLength(50);expect(first.hasMore).toBe(true);expect(last.hasMore).toBe(false);expect(new Set([...first.tickets,...last.tickets].map(t=>t.id)).size).toBe(52);
 });

});
