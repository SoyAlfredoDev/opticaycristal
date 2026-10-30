import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportDesk } from "./SupportDesk";
import type { TicketDetail } from "@/lib/clients/support-types";
const ticket:TicketDetail={id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",folio:"AYU-00001",subject:"Consulta de prueba",status:"abierto",createdAt:"2026-10-30T15:00:00Z",updatedAt:"2026-10-30T15:00:00Z",messages:[{id:"m1",role:"customer",body:"<script>window.bad = true</script>",createdAt:"2026-10-30T15:00:00Z"}]};
const response=(body:unknown,status=200)=>Promise.resolve({ok:status<400,status,json:async()=>body});
beforeEach(()=>vi.stubGlobal("matchMedia",vi.fn(()=>({matches:false}))));
afterEach(()=>vi.unstubAllGlobals());
describe("Tickets: interfaz cliente y administración",()=>{
 it("ofrece un formulario breve, muestra el folio y abre la conversación",async()=>{
  const fetchMock=vi.fn((url:string,init?:RequestInit)=>init?.method==="POST"?response({ticket}):url.includes(ticket.id)?response({ticket}):response({tickets:[],hasMore:false}));vi.stubGlobal("fetch",fetchMock);
  render(<SupportDesk/>);await screen.findByText(/Aún no tienes tickets/);fireEvent.click(screen.getByRole("button",{name:"Nuevo ticket"}));
  fireEvent.change(screen.getByLabelText("Asunto"),{target:{value:"Consulta de prueba"}});fireEvent.change(screen.getByLabelText("¿En qué podemos ayudarte?"),{target:{value:"Mi consulta"}});
  fireEvent.submit(screen.getByRole("form",{name:"Nuevo ticket"}));await screen.findByText("Ticket AYU-00001 creado.");
  expect(await screen.findByRole("heading",{name:"Consulta de prueba"})).toBeVisible();
  const sent=fetchMock.mock.calls.find(([,init])=>init?.method==="POST");expect(JSON.parse(String(sent?.[1]?.body))).toMatchObject({subject:"Consulta de prueba",message:"Mi consulta",requestKey:expect.any(String)});
  expect(screen.getByText(ticket.messages[0].body)).toBeVisible();expect(document.querySelector("script")).toBeNull();
 });
 it("permite al administrador responder y resolver sin cambiar de bandeja",async()=>{
  let current={...ticket,customer:{id:"c1",name:"Cliente Prueba",email:"prueba@example.com"}};
  vi.stubGlobal("fetch",vi.fn((url:string,init?:RequestInit)=>{
   if(init?.method==="POST"){const body=JSON.parse(String(init.body));current={...current,status:body.action==="resolve"?"resuelto":"respondido",messages:[...current.messages,{id:"m2",role:"admin",body:body.message||"Ticket marcado como resuelto.",createdAt:ticket.updatedAt}]};return response({ticket:current});}
   return url.includes(ticket.id)?response({ticket:current}):response({tickets:[current],hasMore:false});
  }));
  render(<SupportDesk admin/>);fireEvent.click(await screen.findByRole("button",{name:/AYU-00001/}));await screen.findByRole("heading",{name:"Consulta de prueba"});
  fireEvent.change(screen.getByLabelText("Respuesta al cliente"),{target:{value:"Te ayudamos con tu cuenta."}});fireEvent.submit(screen.getByRole("form",{name:"Responder ticket"}));
  await screen.findByText("Mensaje enviado.");expect(screen.getByText("Te ayudamos con tu cuenta.")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Marcar resuelto"}));await screen.findByText("Ticket resuelto.");expect(screen.getByText("Si respondes, el ticket se reabrirá.")).toBeVisible();expect(screen.queryByRole("button",{name:"Marcar resuelto"})).not.toBeInTheDocument();
 });
 it("conserva el mensaje e identificador al fallar el envío y permite reintentar",async()=>{
  let count=0;const keys:string[]=[];
  vi.stubGlobal("fetch",vi.fn((url:string,init?:RequestInit)=>{
   if(init?.method==="POST"){keys.push(JSON.parse(String(init.body)).requestKey);return ++count===1?response({error:"No pudimos conectar."},503):response({ticket});}
   return url.includes(ticket.id)?response({ticket}):response({tickets:[],hasMore:false});
  }));
  render(<SupportDesk/>);await screen.findByText(/Aún no tienes tickets/);fireEvent.click(screen.getByRole("button",{name:"Nuevo ticket"}));
  fireEvent.change(screen.getByLabelText("Asunto"),{target:{value:"Mi ayuda"}});fireEvent.change(screen.getByLabelText("¿En qué podemos ayudarte?"),{target:{value:"Mi consulta pendiente"}});
  fireEvent.submit(screen.getByRole("form",{name:"Nuevo ticket"}));await screen.findByRole("alert");expect(screen.getByLabelText("¿En qué podemos ayudarte?")).toHaveValue("Mi consulta pendiente");
  fireEvent.submit(screen.getByRole("form",{name:"Nuevo ticket"}));await screen.findByText("Ticket AYU-00001 creado.");expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
 });
 it("avisa al caducar la sesión y facilita volver a ingresar",async()=>{
  vi.stubGlobal("fetch",vi.fn(()=>response({error:"Tu sesión terminó. Vuelve a ingresar."},401)));render(<SupportDesk/>);
  expect(await screen.findByRole("link",{name:"Volver a ingresar"})).toHaveAttribute("href","/mi-cuenta/ingresar");
 });
 it("muestra los tickets siguientes sin perder los anteriores",async()=>{
  vi.stubGlobal("fetch",vi.fn((url:string)=>response(url.includes("offset=50")?{tickets:[{...ticket,id:"other",folio:"AYU-00002",subject:"Otro ticket"}],hasMore:false}:{tickets:[ticket],hasMore:true})));
  render(<SupportDesk/>);const list=await screen.findByRole("region",{name:"Lista de tickets"});await within(list).findByRole("button",{name:/AYU-00001/});fireEvent.click(screen.getByRole("button",{name:"Ver más tickets"}));
  await waitFor(()=>expect(within(list).getByRole("button",{name:/AYU-00002/})).toBeVisible());expect(within(list).getByRole("button",{name:/AYU-00001/})).toBeVisible();
 });
});
