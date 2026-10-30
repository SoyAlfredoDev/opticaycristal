import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({push:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>m}));
import { AdminSales } from "./AdminSales";
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
describe("Registro administrativo de una venta",()=>{
 it("conserva todos los datos y el identificador al reintentar una venta",async()=>{
  const response=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json"}});
  const fetcher=vi.fn().mockResolvedValueOnce(response({customer:{id:"customer",firstName:"Demostración",lastName:"QA",email:"qa@example.com",tier:{name:"Premium",maxAmount:80000},credit:{principalOutstanding:0}}}))
   .mockResolvedValueOnce(response({quote:{net:100000,vat:19000,total:119000,protectedCost:50000,maximumCredit:69000,maxInstallments:2,reason:""}}))
   .mockRejectedValueOnce(new Error("Conexión interrumpida"))
   .mockResolvedValueOnce(response({requestKey:"prepared"}))
   .mockResolvedValueOnce(response({id:"sale"}));
  vi.stubGlobal("fetch",fetcher);
  render(<AdminSales initialProducts={[{id:"product",name:"Paquete QA",protectedCost:50000}]}/>);
  fireEvent.change(screen.getByLabelText("RUT del cliente"),{target:{value:"90.000.001-4"}});
  fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));
  await screen.findByText("Demostración QA");
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"product"}});
  fireEvent.change(screen.getByLabelText("Precio total final con IVA incluido"),{target:{value:"119000"}});
  fireEvent.click(screen.getByRole("button",{name:"Calcular condiciones"}));
  await screen.findByLabelText("Primer vencimiento");
  fireEvent.change(screen.getByLabelText("Primer vencimiento"),{target:{value:"2026-11-30"}});
  fireEvent.click(screen.getByLabelText("Revisé presencialmente la cédula del cliente, sin guardar copia."));
  fireEvent.click(screen.getByLabelText(/Confirmo que recibí/));
  fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"Reintentar con los mismos datos"}));
  await waitFor(()=>expect(m.push).toHaveBeenCalledWith("/admin/clientes/customer?venta=sale"));
  const first=JSON.parse(fetcher.mock.calls[2][1].body),retry=JSON.parse(fetcher.mock.calls[3][1].body);
  expect(retry).toEqual(first);
  expect(retry.operation).toMatchObject({customerId:"customer",productId:"product",total:119000,credit:69000,installmentCount:2,firstDueDate:"2026-11-30",identityChecked:true,depositReceived:true});
 });
});
