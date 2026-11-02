import { fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
const navigation=vi.hoisted(()=>({push:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>navigation}));
import { AdminSales } from "./AdminSales";
import { ProductEditor } from "./ProductEditor";
import { OperationRecovery } from "./OperationRecovery";
import { operationSlot } from "./sales-client";
const customer={id:"audit",firstName:"Auditoría",lastName:"QA",email:"audit@example.com",tier:{name:"Premium",maxAmount:80000},credit:{principalOutstanding:0}};
const response=(body:unknown)=>new Response(JSON.stringify(body),{status:200});
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();vi.clearAllMocks();});
describe("Regresiones de la auditoría",()=>{
 it("bloquea campos al calcular y descarta respuestas desactualizadas",async()=>{
  let finish!:(value:Response)=>void;
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(response({customer})).mockImplementationOnce(()=>new Promise(r=>{finish=r;})));
  render(<AdminSales initialProducts={[{id:"product",name:"Paquete QA",protectedCost:50000}]}/>);
  fireEvent.change(screen.getByLabelText("RUT del cliente"),{target:{value:"90.000.001-4"}});fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));await screen.findByText("Auditoría QA");fireEvent.click(screen.getByRole("button",{name:"Continuar"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"product"}});fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"119000"}});fireEvent.click(screen.getByRole("button",{name:"Calcular y continuar"}));
  expect(screen.getByLabelText("Precio total con IVA incluido")).toBeDisabled();
  // Even an external state change must invalidate an in-flight result.
  fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"200000"}});
  finish(response({quote:{net:100000,vat:19000,total:119000,protectedCost:50000,maximumCredit:69000,maxInstallments:2}}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"Calcular y continuar"})).toBeEnabled());
  expect(screen.queryByLabelText("Primer vencimiento")).not.toBeInTheDocument();expect(screen.getByLabelText("Precio total con IVA incluido")).toHaveValue(200000);
 });
 it("precarga el producto y permite revisar el cambio anterior y nuevo",()=>{
  render(<ProductEditor products={[{id:"product",name:"Paquete QA",protectedCost:50000}]} onSaved={vi.fn()}/>);
  fireEvent.click(screen.getByText("Productos y costos"));fireEvent.change(screen.getByLabelText("Producto a editar"),{target:{value:"product"}});
  expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Paquete QA");expect(screen.getByLabelText("Costo protegido por unidad")).toHaveValue(50000);
  fireEvent.change(screen.getByLabelText("Costo protegido por unidad"),{target:{value:"60000"}});fireEvent.click(screen.getByRole("button",{name:"Revisar cambio"}));
  expect(screen.getByText(/\$50.000 → Paquete QA · \$60.000/)).toBeInTheDocument();
 });
 it("recupera tras recargar un resultado guardado sin volver a cobrar",async()=>{
  sessionStorage.setItem(operationSlot("create"),"opaque-operation-id");
  const fetcher=vi.fn().mockResolvedValue(response({operation:{kind:"create",payload:{customerId:"audit",total:119000},resultId:"sale"}}));vi.stubGlobal("fetch",fetcher);
  render(<OperationRecovery kind="create"/>);fireEvent.click(await screen.findByRole("button",{name:"Ver registro"}));
  await waitFor(()=>expect(navigation.push).toHaveBeenCalledWith("/admin/clientes/audit?venta=sale"));expect(fetcher).toHaveBeenCalledTimes(1);expect(sessionStorage.getItem(operationSlot("create"))).toBeNull();
 });
 it("retoma una operación incompleta con el mismo identificador",async()=>{
  const key="opaque-operation-id",payload={action:"payment",requestKey:key,saleId:"sale",amount:10000,paidOn:"2026-10-29",reference:"QA"};sessionStorage.setItem(operationSlot("payment"),key);
  const fetcher=vi.fn().mockResolvedValueOnce(response({operation:{kind:"payment",payload,resultId:null}})).mockResolvedValueOnce(response({requestKey:key})).mockResolvedValueOnce(response({id:"payment"}));vi.stubGlobal("fetch",fetcher);
  render(<OperationRecovery kind="payment"/>);fireEvent.click(await screen.findByRole("button",{name:"Retomar registro"}));
  await waitFor(()=>expect(sessionStorage.getItem(operationSlot("payment"))).toBeNull());expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({action:"prepare",operation:payload});expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({action:"execute",requestKey:key});
 });
});
