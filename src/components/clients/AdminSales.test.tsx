import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
import { AdminSales } from "./AdminSales";
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(){this.setAttribute("open","");}});Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(){this.removeAttribute("open");}});});
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
describe("Registro administrativo de una venta",()=>{
 it("conserva todos los datos y el identificador al reintentar una venta",async()=>{
  const response=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json"}});
  const fetcher=vi.fn().mockResolvedValueOnce(response({customer:{id:"customer",firstName:"Demostración",lastName:"QA",email:"qa@example.com",emailVerified:true,tier:{name:"Premium",maxAmount:80000},credit:{principalOutstanding:0}}}))
   .mockResolvedValueOnce(response({quote:{net:100000,vat:19000,total:119000,protectedCost:50000,maximumCredit:69000,maxInstallments:2,reason:""}}))
   .mockRejectedValueOnce(new Error("Conexión interrumpida"))
   .mockResolvedValueOnce(response({requestKey:"prepared"}))
   .mockResolvedValueOnce(response({id:"sale"}));
  vi.stubGlobal("fetch",fetcher);
  render(<AdminSales initialProducts={[{id:"product",name:"Paquete QA",protectedCost:50000}]}/>);
  fireEvent.change(screen.getByLabelText("RUT del cliente"),{target:{value:"90.000.001-4"}});
  fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));
  await screen.findByText("Demostración QA");
  expect(screen.queryByLabelText("Producto o paquete",{exact:true})).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Continuar"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"product"}});
  fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"119000"}});
  fireEvent.click(screen.getByRole("button",{name:"Calcular y continuar"}));
  await screen.findByLabelText("Primer vencimiento");
  fireEvent.change(screen.getByLabelText("Primer vencimiento"),{target:{value:"2026-11-30"}});
  expect(screen.queryByLabelText(/Revisé presencialmente/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));
  expect(await screen.findByRole("dialog",{name:"Antes de registrar"})).toBeInTheDocument();expect(fetcher).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));expect(fetcher).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));fireEvent.click(screen.getByRole("button",{name:"Confirmar venta"}));
  await screen.findByRole("alert");fireEvent.click(screen.getByRole("button",{name:"Confirmar venta"}));
  await screen.findByText("Venta registrada");expect(screen.getByRole("button",{name:"Descargar compromiso de pago"})).toBeInTheDocument();
  const first=JSON.parse(fetcher.mock.calls[2][1].body),retry=JSON.parse(fetcher.mock.calls[3][1].body);
  expect(retry).toEqual(first);
  expect(retry.operation).toMatchObject({customerId:"customer",productId:"product",total:119000,credit:69000,installmentCount:2,firstDueDate:"2026-11-30",identityChecked:true,depositReceived:true,conditionsReviewed:true});
 });
 it("calcula por categoría sin solicitar un costo variable y conserva los controles de venta",async()=>{
  const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{"Content-Type":"application/json"}});
  const fetcher=vi.fn().mockResolvedValueOnce(response({customer:{id:"qa",firstName:"Cliente",lastName:"Prueba",tier:{name:"Start"}}})).mockResolvedValueOnce(response({quote:{net:37815,vat:7185,total:45000,maximumCredit:5000,maxInstallments:1,reason:""}}));vi.stubGlobal("fetch",fetcher);
  render(<AdminSales initialProducts={[{id:"variable",name:"Lente óptico",protectedCost:null}]} contractReady={false}/>);
  fireEvent.change(screen.getByLabelText("RUT del cliente"),{target:{value:"12.345.678-5"}});fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));await screen.findByText("Cliente Prueba");fireEvent.click(screen.getByRole("button",{name:"Continuar"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"variable"}});fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"45000"}});
  expect(screen.queryByLabelText(/Costo protegido por unidad/)).not.toBeInTheDocument();expect(screen.getByRole("button",{name:"Calcular y continuar"})).toBeEnabled();fireEvent.click(screen.getByRole("button",{name:"Calcular y continuar"}));await screen.findByLabelText("Primer vencimiento");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({action:"quote",pricingPolicy:"category"});
  expect(screen.getByText(/Falta configurar la firma del representante/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText("Primer vencimiento"),{target:{value:"2026-12-02"}});expect(screen.getByRole("button",{name:"Registrar venta"})).toBeEnabled();fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));expect(screen.getByRole("button",{name:"Confirmar venta"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));
  fireEvent.click(screen.getByRole("button",{name:"Volver"}));fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"46000"}});expect(screen.queryByLabelText("Primer vencimiento")).not.toBeInTheDocument();
 });

});
