import "server-only";
import { scheduleSupportMail } from "./support-mail-dispatch";
import { customerSession } from "./auth";
import { customerAdminSession } from "./admin";
import { privateJson, readClientBody, sameClientOrigin } from "./http";
import { createSupportTicket, getSupportTicket, listSupportTickets, SupportError, updateSupportTicket, type SupportActor } from "./support";
async function actor(admin: boolean): Promise<SupportActor | null> {
  if (admin) { const staff=await customerAdminSession(); return staff ? { kind:"admin", id:staff.u } : null; }
  const session=await customerSession(); return session ? { kind:"customer", id:session.user.id } : null;
}
function requestKeyOf(body:unknown) { return body&&typeof body==="object"&&"requestKey" in body&&typeof body.requestKey==="string"?body.requestKey:undefined; }
function errorResponse(error: unknown) {
  return privateJson({error:error instanceof SupportError ? error.message : "No pudimos cargar soporte. Inténtalo nuevamente."},error instanceof SupportError ? error.status : 503);
}
export function supportCollection(admin: boolean) {
  return {
    GET: async (request: Request) => {
      const user=await actor(admin); if (!user) return privateJson({error:"Tu sesión terminó. Vuelve a ingresar."},401);
      try { const q=new URL(request.url).searchParams;const list=await listSupportTickets(user,{status:q.get("status")||"todos",q:q.get("q")||"",offset:Number(q.get("offset")||0)});scheduleSupportMail(user.kind==="admin"?{}:{customerId:user.id});return privateJson(list); }
      catch(error) { return errorResponse(error); }
    },
    POST: async (request: Request) => {
      const user=await actor(admin); if (!user) return privateJson({error:"Tu sesión terminó. Vuelve a ingresar."},401);
      if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
      let body; try { body=await readClientBody(request); } catch { return privateJson({error:"Revisa los datos del ticket."},400); }
      try { const ticket=await createSupportTicket(user,body);scheduleSupportMail({ticketId:ticket.id,requestKey:requestKeyOf(body)});return privateJson({ticket},201); } catch(error) { return errorResponse(error); }
    },
  };
}
type Context = { params: Promise<{id:string}> };
export function supportConversation(admin: boolean) {
  return {
    GET: async (_request: Request, context: Context) => {
      const user=await actor(admin); if (!user) return privateJson({error:"Tu sesión terminó. Vuelve a ingresar."},401);
      try { const ticket=await getSupportTicket(user,(await context.params).id);scheduleSupportMail({ticketId:ticket.id});return privateJson({ticket}); } catch(error) { return errorResponse(error); }
    },
    POST: async (request: Request, context: Context) => {
      const user=await actor(admin); if (!user) return privateJson({error:"Tu sesión terminó. Vuelve a ingresar."},401);
      if (!sameClientOrigin(request)) return privateJson({error:"Origen no permitido."},403);
      let body; try { body=await readClientBody(request); } catch { return privateJson({error:"Revisa tu mensaje."},400); }
      try { const ticket=await updateSupportTicket(user,(await context.params).id,body);scheduleSupportMail({ticketId:ticket.id,requestKey:requestKeyOf(body)});return privateJson({ticket}); } catch(error) { return errorResponse(error); }
    },
  };
}
