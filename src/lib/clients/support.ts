import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable } from "./db";
import { protectClientValue, revealClientValue } from "./privacy";
import type { TicketDetail, TicketList, TicketStatus, TicketSummary } from "./support-types";
export type SupportActor = { kind: "customer" | "admin"; id: string };
export class SupportError extends Error { constructor(message: string, public status = 400) { super(message); } }
const tickets = () => clientTable("oc_client_support_tickets");
const messages = () => clientTable("oc_client_support_messages");
const users = () => clientTable("oc_client_user");
export function supportId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new SupportError("Identificador no válido.");
  return value;
}
function text(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max || value.includes("\0")) throw new SupportError(`${name}: escribe entre 1 y ${max} caracteres.`);
  return value.trim().replace(/\r\n/g, "\n");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SupportError("Revisa los datos del ticket.");
  return value as Record<string, unknown>;
}
type TicketRow = { id: string; folio: string; customer_id: string; subject_cipher: string; status: TicketStatus; created_at: Date | string; updated_at: Date | string; name?: string; email?: string };
const iso = (value: Date | string) => new Date(value).toISOString();
function summary(row: TicketRow, actor: SupportActor): TicketSummary {
  return { id: row.id, folio: `AYU-${String(row.folio).padStart(5,"0")}`, subject: revealClientValue(row.subject_cipher, "support-subject"), status: row.status, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), ...(actor.kind === "admin" ? { customer: { id: row.customer_id, name: row.name || "Cliente", email: row.email || "" } } : {}) };
}
async function transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await clientPool().connect();
  try { await db.query("BEGIN"); const result = await work(db); await db.query("COMMIT"); return result; }
  catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}
async function ownedTicket(db: Pick<PoolClient,"query">, actor: SupportActor, id: string, lock = false) {
  const result = await db.query<TicketRow>(`SELECT * FROM ${tickets()} WHERE id=$1 AND ($2::text IS NULL OR customer_id=$2)${lock ? " FOR UPDATE" : ""}`, [supportId(id), actor.kind === "customer" ? actor.id : null]);
  if (!result.rows[0]) throw new SupportError("No encontramos este ticket.", 404);
  return result.rows[0];
}
export async function listSupportTickets(actor: SupportActor, options: { status?: string; q?: string; offset?: number } = {}): Promise<TicketList> {
  const status = options.status || "todos";
  if (!["todos","abierto","respondido","resuelto"].includes(status)) throw new SupportError("Estado no válido.");
  const offset = options.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) throw new SupportError("Página no válida.");
  const q = (options.q || "").trim();
  if (q.length > 100) throw new SupportError("La búsqueda es demasiado larga.");
  const result = await clientPool().query<TicketRow>(`SELECT t.*,u.name,u.email FROM ${tickets()} t JOIN ${users()} u ON u.id=t.customer_id WHERE ($1::text IS NULL OR t.customer_id=$1) AND ($2='todos' OR t.status=$2) AND ($3='' OR u.name ILIKE '%'||$3||'%' OR u.email ILIKE '%'||$3||'%' OR ('AYU-'||lpad(t.folio::text,greatest(5,length(t.folio::text)),'0')) ILIKE '%'||$3||'%') ORDER BY t.updated_at DESC,t.id DESC LIMIT 51 OFFSET $4`, [actor.kind === "customer" ? actor.id : null, status, actor.kind === "admin" ? q : "", offset]);
  return { tickets: result.rows.slice(0,50).map(row => summary(row,actor)), hasMore: result.rows.length > 50 };
}
export async function getSupportTicket(actor: SupportActor, id: string): Promise<TicketDetail> {
  // Check ownership and read the conversation in the same transaction as its status.
  return transaction(async db => {
    const row = await ownedTicket(db,actor,id,true);
    if (actor.kind === "admin") {
      const person = await db.query<{name:string;email:string}>(`SELECT name,email FROM ${users()} WHERE id=$1`, [row.customer_id]);
      Object.assign(row,person.rows[0]);
    }
    const thread = await db.query<{id:string;actor_kind:"customer"|"admin";body_cipher:string;created_at:Date|string}>(`SELECT id,actor_kind,body_cipher,created_at FROM ${messages()} WHERE ticket_id=$1 ORDER BY position`, [id]);
    return { ...summary(row,actor), messages: thread.rows.map(item => ({ id:item.id, role:item.actor_kind, body:revealClientValue(item.body_cipher,"support-message"), createdAt:iso(item.created_at) })) };
  });
}
async function messageRate(db: PoolClient, actor: SupportActor) {
  const count = await db.query<{count:string}>(`SELECT count(*)::text AS count FROM ${messages()} WHERE author_id=$1 AND actor_kind=$2 AND created_at>now()-interval '1 hour'`,[actor.id,actor.kind]);
  if (Number(count.rows[0].count) >= (actor.kind === "admin" ? 120 : 20)) throw new SupportError("Has enviado varios mensajes. Inténtalo más tarde.",429);
}
export async function createSupportTicket(actor: SupportActor, raw: unknown) {
  if (actor.kind !== "customer") throw new SupportError("Los tickets los inicia el cliente.",403);
  const input=object(raw), key=supportId(input.requestKey), subject=text(input.subject,"Asunto",100), body=text(input.message,"Mensaje",2000);
  const id = await transaction(async db => {
    // Serialize creation per customer so parallel requests cannot evade the limits.
    const customer=await db.query(`SELECT id FROM ${users()} WHERE id=$1 FOR UPDATE`,[actor.id]);
    if (!customer.rows.length) throw new SupportError("Cuenta no disponible.",401);
    const previous=await db.query<TicketRow>(`SELECT * FROM ${tickets()} WHERE customer_id=$1 AND request_key=$2`,[actor.id,key]);
    if (previous.rows[0]) {
      const first=await db.query<{body_cipher:string}>(`SELECT body_cipher FROM ${messages()} WHERE ticket_id=$1 ORDER BY position LIMIT 1`,[previous.rows[0].id]);
      if (revealClientValue(previous.rows[0].subject_cipher,"support-subject")!==subject || revealClientValue(first.rows[0].body_cipher,"support-message")!==body) throw new SupportError("Este envío ya se registró con otros datos.",409);
      return previous.rows[0].id;
    }
    const limits=await db.query<{recent:string;active:string}>(`SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour')::text AS recent,count(*) FILTER(WHERE status<>'resuelto')::text AS active FROM ${tickets()} WHERE customer_id=$1`,[actor.id]);
    if (Number(limits.rows[0].recent)>=5 || Number(limits.rows[0].active)>=10) throw new SupportError("Ya tienes varias solicitudes. Continúa en un ticket existente o inténtalo más tarde.",429);
    await messageRate(db,actor);
    const ticketId=randomUUID();
    await db.query(`INSERT INTO ${tickets()}(id,customer_id,subject_cipher,request_key) VALUES($1,$2,$3,$4)`,[ticketId,actor.id,protectClientValue(subject,"support-subject"),key]);
    await db.query(`INSERT INTO ${messages()}(id,ticket_id,actor_kind,author_id,body_cipher,request_key) VALUES($1,$2,'customer',$3,$4,$5)`,[randomUUID(),ticketId,actor.id,protectClientValue(body,"support-message"),key]);
    return ticketId;
  });
  return getSupportTicket(actor,id);
}
export async function updateSupportTicket(actor: SupportActor, id: string, raw: unknown) {
  const input=object(raw), key=supportId(input.requestKey);
  if (input.action!=="reply" && input.action!=="resolve") throw new SupportError("Acción no válida.");
  const body=input.action==="reply" ? text(input.message,"Mensaje",2000) : "Ticket marcado como resuelto.";
  await transaction(async db => {
    if(actor.kind === "customer") await db.query(`SELECT id FROM ${users()} WHERE id=$1 FOR UPDATE`,[actor.id]);
    const ticket=await ownedTicket(db,actor,id,true);
    const previous=await db.query<{body_cipher:string;actor_kind:string;author_id:string;event:string}>(`SELECT body_cipher,actor_kind,author_id,event FROM ${messages()} WHERE ticket_id=$1 AND request_key=$2`,[id,key]);
    if (previous.rows[0]) {
      const old=previous.rows[0];
      if (old.event!==(input.action==="resolve"?"resolved":"message") || old.actor_kind!==actor.kind || old.author_id!==actor.id || revealClientValue(old.body_cipher,"support-message")!==body) throw new SupportError("Este envío ya se registró con otros datos.",409);
      return;
    }
    if (input.action==="resolve") {
      if (ticket.status==="resuelto") return;
      const latest=await db.query<{id:string}>(`SELECT id FROM ${messages()} WHERE ticket_id=$1 ORDER BY position DESC LIMIT 1`,[id]);
      if (input.lastMessageId!==latest.rows[0]?.id) throw new SupportError("Hay novedades en el ticket. Actualízalo antes de resolverlo.",409);
    }
    const count=await db.query<{count:string}>(`SELECT count(*)::text AS count FROM ${messages()} WHERE ticket_id=$1`,[id]);
    if (input.action === "reply" && Number(count.rows[0].count)>=100) throw new SupportError("Este ticket alcanzó el límite de mensajes. Crea uno nuevo para continuar.",429);
    await messageRate(db,actor);
    await db.query(`INSERT INTO ${messages()}(id,ticket_id,actor_kind,author_id,body_cipher,request_key,event) VALUES($1,$2,$3,$4,$5,$6,$7)`,[randomUUID(),id,actor.kind,actor.id,protectClientValue(body,"support-message"),key,input.action==="resolve"?"resolved":"message"]);
    const status=input.action==="resolve" ? "resuelto" : actor.kind==="admin" ? "respondido" : "abierto";
    await db.query(`UPDATE ${tickets()} SET status=$2,updated_at=clock_timestamp() WHERE id=$1`,[id,status]);
  });
  return getSupportTicket(actor,id);
}
