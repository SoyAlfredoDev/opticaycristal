import { act,cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import type { CustomerSnapshot } from "@/lib/clients/types";
import type { HistorySale } from "@/lib/clients/history-types";
const navigation=vi.hoisted(()=>({router:{replace:vi.fn(),refresh:vi.fn()},path:"/mi-cuenta/compras"}));
vi.mock("next/navigation",()=>({usePathname:()=>navigation.path,useRouter:()=>navigation.router}));
import { CustomerDataProvider,useCustomerData } from "./CustomerDataProvider";
import { CustomerSales } from "./CustomerSales";
const snapshot:CustomerSnapshot={
 customer:{id:"own",firstName:"Cliente",lastName:"Prueba",email:"test@example.invalid",emailVerified:true,whatsapp:"+56900000000",whatsappVerified:false,rut:"123456785",identityVerified:false,createdAt:"2026-01-01T00:00:00.000Z",
 tier:{code:"start",name:"Start",maxAmount:40000,maxPercent:30,maxInstallments:1},credit:{principalOutstanding:10000,capacity:30000,available:0,enabled:true,needsIdentity:false},activity:{purchaseCount:21,creditCount:1,nextInstallment:{dueDate:"2030-01-31",amount:30000,paid:20000}}},
 tiers:[],historyVersion:"version-1"
};
const sale=(index:number):HistorySale=>({id:`sale-${index}`,productName:`Compra ${index}`,quantity:1,total:45000,net:37815,vat:7185,deposit:45000,credit:0,remaining:0,tierCode:"start",createdAt:"2026-01-01T00:00:00.000Z",status:"active",signedAt:null,commitmentVersion:"test",installments:[],payments:[],paymentsNextCursor:null});
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{ETag:'"version"',"X-Customer-Scope":"own"}});
function Refresh(){const data=useCustomerData();return <button onClick={()=>void data.refresh()}>Actualizar resumen</button>;}
function Portal({cuotas=false}:{cuotas?:boolean}){return <CustomerDataProvider ownerId="own" viewer={{firstName:"Cliente",lastName:"Prueba"}}><CustomerSales installmentsOnly={cuotas}/><Refresh/></CustomerDataProvider>;}
beforeEach(()=>{vi.stubGlobal("BroadcastChannel",undefined);HTMLElement.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("muestra diez compras por página y vuelve a una página guardada sin otra consulta",async()=>{
 const history=vi.fn((url:string)=>response({sales:Array.from({length:10},(_,index)=>sale(index+(url.includes("cursor")?10:0))),nextCursor:url.includes("cursor")?null:"next"}));
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.includes("resumen")?response(snapshot):history(url)));
 render(<Portal/>);await screen.findByRole("heading",{name:"Compra 0"});
 expect(screen.getAllByRole("heading",{level:2})).toHaveLength(10);
 fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));await screen.findByRole("heading",{name:"Compra 10"});expect(screen.queryByRole("heading",{name:"Compra 0"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Anterior"}));await screen.findByRole("heading",{name:"Compra 0"});expect(history).toHaveBeenCalledTimes(2);
});
it("permite volver si falla una página y reintenta sin mostrarla como vacía",async()=>{
 let fail=true;
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.includes("resumen"))return response(snapshot);
  if(url.includes("cursor")&&fail)throw new Error("offline");
  return response({sales:[sale(url.includes("cursor")?10:0)],nextCursor:url.includes("cursor")?null:"next"});
 }));
 render(<Portal/>);await screen.findByRole("heading",{name:"Compra 0"});fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));await screen.findByRole("alert");
 expect(screen.getByRole("button",{name:"Anterior"})).toBeEnabled();expect(screen.queryByText("Aún no hay compras.")).not.toBeInTheDocument();
 fail=false;fireEvent.click(screen.getByRole("button",{name:"Reintentar"}));await screen.findByRole("heading",{name:"Compra 10"});
});
it("muestra la próxima cuota global aunque la venta no esté en la página y pagina sus pagos",async()=>{
 const record={...sale(0),credit:30000,remaining:10000,deposit:15000,payments:Array.from({length:10},(_,index)=>({id:`p-${index}`,amount:1000,paidOn:"2026-01-01",reference:`Pago ${index}`,reversed:false})),paymentsNextCursor:"next-payment"};
 const fetcher=vi.fn(async(url:string)=>{
  if(url.includes("resumen"))return response(snapshot);
  if(url.includes("/pagos"))return response({payments:[{id:"p-10",amount:1000,paidOn:"2026-01-01",reference:"Pago 10",reversed:true}],nextCursor:null});
  return response({sales:[record],nextCursor:null});
 });vi.stubGlobal("fetch",fetcher);
 render(<Portal cuotas/>);await screen.findByRole("heading",{name:"Compra 0"});
 expect(screen.getByText("Próxima cuota")).toBeVisible();expect(screen.getByText("31/01/2030")).toBeVisible();
 fireEvent.click(screen.getByText("Detalle de la compra"));expect(screen.getByText(/Pago 0$/)).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"Siguientes"}));await screen.findByText(/Pago 10$/);expect(screen.queryByText(/Pago 0$/)).not.toBeInTheDocument();
 expect(screen.getByText(/Revertido/)).toBeVisible();fireEvent.click(screen.getByRole("button",{name:"Anteriores"}));expect(screen.getByText(/Pago 0$/)).toBeVisible();
});
it("invalida las páginas al llegar una venta o un pago actualizado",async()=>{
 let version="version-1";
 const history=vi.fn(()=>response({sales:[sale(version==="version-1"?0:99)],nextCursor:null}));
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.includes("resumen")?response({...snapshot,historyVersion:version}):history()));
 render(<Portal/>);await screen.findByRole("heading",{name:"Compra 0"});version="version-2";
 await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Actualizar resumen"})));
 await screen.findByRole("heading",{name:"Compra 99"});expect(history).toHaveBeenCalledTimes(2);expect(screen.queryByRole("heading",{name:"Compra 0"})).not.toBeInTheDocument();
});
it("no consulta historiales vacíos al navegar entre vistas",async()=>{
 const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(response({...snapshot,customer:{...snapshot.customer,credit:{...snapshot.customer.credit,principalOutstanding:0},activity:{purchaseCount:0,creditCount:0,nextInstallment:null}}})));vi.stubGlobal("fetch",fetcher);
 const page=render(<Portal/>);await screen.findByRole("heading",{name:"Tu próxima mirada te espera"});page.rerender(<Portal cuotas/>);
 await waitFor(()=>expect(screen.getByRole("heading",{name:"¡Estás al día!"})).toBeVisible());expect(fetcher).toHaveBeenCalledTimes(1);
});

it("no presenta páginas que pertenecen a otra sesión tras cambiar de cuenta",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.includes("resumen")?response(snapshot):new Response(JSON.stringify({sales:[sale(999)],nextCursor:null}),{headers:{"X-Customer-Scope":"other"}})));
 render(<Portal/>);await waitFor(()=>expect(navigation.router.replace).toHaveBeenCalledWith("/mi-cuenta/ingresar"));
 expect(screen.queryByRole("heading",{name:"Compra 999"})).not.toBeInTheDocument();
});
