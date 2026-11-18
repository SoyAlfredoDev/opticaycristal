import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
import { AdminSales } from "./AdminSales";
beforeAll(()=>{Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(){this.setAttribute("open","");}});Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(){this.removeAttribute("open");}});});
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});
describe("Registro administrativo de una venta",()=>{
 it("aplica cupo máximo con motivo y recalcula pie y cuotas; guarda el control devuelto por el servidor",async()=>{
  const reply=(value:unknown)=>Response.json(value);
  const initialQuote={total:75000,net:63025,vat:11975,maximumCredit:30000,maximumCreditAtCapacity:60000,standardMaximumCredit:30000,maxInstallments:2,reason:"",enabled:true};
  const fetcher=vi.fn().mockResolvedValueOnce(reply({customer:{id:"vip",firstName:"Camila",lastName:"Ejemplo",emailVerified:true,tier:{name:"VIP",code:"vip",maxAmount:60000},credit:{principalOutstanding:0,available:60000}}}))
   .mockResolvedValueOnce(reply({quote:initialQuote})).mockResolvedValueOnce(reply({quote:{...initialQuote,maximumCredit:60000,creditOverrideApplied:true}}))
   .mockResolvedValueOnce(reply({requestKey:"prepared"})).mockResolvedValueOnce(reply({id:"sale",controlNumber:"CR-0000001"}));
  vi.stubGlobal("fetch",fetcher);render(<AdminSales initialProducts={[{id:"product",name:"Lentes",protectedCost:null}]}/>);
  fireEvent.change(screen.getByLabelText("Buscar por RUT"),{target:{value:"12.345.678-5"}});fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));await screen.findByText("Camila Ejemplo");fireEvent.click(screen.getByRole("button",{name:"Continuar a producto"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"product"}});fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"75000"}});
  expect(screen.getByLabelText("Número de control interno")).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button",{name:"Calcular y continuar"}));
  fireEvent.click(await screen.findByRole("button",{name:/Aplicar cupo máximo/}));
  expect(screen.getByRole("button",{name:"Aplicar y recalcular"})).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Motivo para aplicar el cupo máximo"),{target:{value:"Condición comercial acordada"}});fireEvent.click(screen.getByRole("button",{name:"Aplicar y recalcular"}));
  await screen.findByText("Cupo máximo aplicado: $60.000");
  expect(screen.getByText("$15.000",{exact:true})).toBeInTheDocument();
  expect(screen.getByLabelText(/Monto a crédito/)).toHaveAttribute("readonly");
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({action:"quote",creditOverrideReason:"Condición comercial acordada"});
  fireEvent.change(screen.getByLabelText("Primer vencimiento"),{target:{value:"2030-01-31"}});
  const schedule=within(screen.getByLabelText("Calendario de pago"));expect(schedule.getAllByText("$30.000")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));fireEvent.click(screen.getByRole("button",{name:"Confirmar venta"}));
  await screen.findByText("CR-0000001");
  expect(JSON.parse(fetcher.mock.calls[3][1].body).operation).toMatchObject({credit:60000,installmentCount:2,creditOverrideReason:"Condición comercial acordada"});
  expect(JSON.parse(fetcher.mock.calls[3][1].body).operation).not.toHaveProperty("internalControl");
 });
 it("conserva todos los datos y el identificador al reintentar una venta",async()=>{
  const response=(value:unknown)=>new Response(JSON.stringify(value),{status:200,headers:{"Content-Type":"application/json"}});
  const fetcher=vi.fn().mockResolvedValueOnce(response({customer:{id:"customer",firstName:"Demostración",lastName:"QA",email:"qa@example.com",emailVerified:true,tier:{name:"Premium",maxAmount:80000},credit:{principalOutstanding:0}}}))
   .mockResolvedValueOnce(response({quote:{net:100000,vat:19000,total:119000,protectedCost:50000,maximumCredit:69000,maxInstallments:2,reason:""}}))
   .mockRejectedValueOnce(new Error("Conexión interrumpida"))
   .mockResolvedValueOnce(response({requestKey:"prepared"}))
   .mockResolvedValueOnce(response({id:"sale"}));
  vi.stubGlobal("fetch",fetcher);
  render(<AdminSales initialProducts={[{id:"product",name:"Paquete QA",protectedCost:50000}]}/>);
  fireEvent.change(screen.getByLabelText("Buscar por RUT"),{target:{value:"12.345.678-5"}});
  fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));
  await screen.findByText("Demostración QA");
  expect(screen.queryByLabelText("Producto o paquete",{exact:true})).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Continuar a producto"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"product"}});
  fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"119000"}});
  expect(screen.getByLabelText("Número de control interno")).toHaveAttribute("readonly");
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
 it("calcula por nivel sin solicitar un costo variable y conserva los controles de venta",async()=>{
  const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{"Content-Type":"application/json"}});
  const fetcher=vi.fn().mockResolvedValueOnce(response({customer:{id:"qa",firstName:"Cliente",lastName:"Prueba",tier:{name:"Start"}}})).mockResolvedValueOnce(response({quote:{net:37815,vat:7185,total:45000,maximumCredit:5000,maxInstallments:1,reason:""}}));vi.stubGlobal("fetch",fetcher);
  render(<AdminSales initialProducts={[{id:"variable",name:"Lente óptico",protectedCost:null}]} contractReady={false}/>);
  fireEvent.change(screen.getByLabelText("Buscar por RUT"),{target:{value:"12.345.678-5"}});fireEvent.click(screen.getByRole("button",{name:"Buscar cliente"}));await screen.findByText("Cliente Prueba");fireEvent.click(screen.getByRole("button",{name:"Continuar a producto"}));
  fireEvent.change(screen.getByLabelText("Producto o paquete",{exact:true}),{target:{value:"variable"}});fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"45000"}});
  expect(screen.queryByLabelText(/Costo protegido por unidad/)).not.toBeInTheDocument();expect(screen.getByRole("button",{name:"Calcular y continuar"})).toBeEnabled();fireEvent.click(screen.getByRole("button",{name:"Calcular y continuar"}));await screen.findByLabelText("Primer vencimiento");
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({action:"quote",pricingPolicy:"category"});
  expect(screen.getByText(/Falta configurar la firma del representante/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText("Primer vencimiento"),{target:{value:"2026-12-02"}});expect(screen.getByRole("button",{name:"Registrar venta"})).toBeEnabled();fireEvent.click(screen.getByRole("button",{name:"Registrar venta"}));expect(screen.getByRole("button",{name:"Confirmar venta"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));
  fireEvent.click(screen.getByRole("button",{name:"Volver"}));fireEvent.change(screen.getByLabelText("Precio total con IVA incluido"),{target:{value:"46000"}});expect(screen.queryByLabelText("Primer vencimiento")).not.toBeInTheDocument();
 });

 it.each([
  { emailVerified: true, outstanding: 0, expected: "$50.000" },
  { emailVerified: false, outstanding: 0, expected: "$0" },
  { emailVerified: true, outstanding: 10000, expected: "$0" },
 ])("actualiza el nivel en el resumen respetando verificación y saldo: $emailVerified/$outstanding", async ({ emailVerified, outstanding, expected }) => {
  const tiers = [
   { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 2 },
   { code: "star_plus", name: "Star Plus", maxAmount: 50000, maxPercent: 30, maxInstallments: 3 },
  ];
  const settings = { currentCategory: "start", tiers, history: [] };
  const response = (body: unknown) => new Response(JSON.stringify(body));
  const fetcher = vi.fn().mockResolvedValueOnce(response({ customer: {
   id: "qa", firstName: "Camila", lastName: "Ejemplo", tier: tiers[0], emailVerified,
   credit: { principalOutstanding: outstanding, capacity: 40000 - outstanding, available: 0 },
  } })).mockResolvedValueOnce(response({ settings, canEdit: true }))
   .mockResolvedValueOnce(response({ settings: { ...settings, currentCategory: "star_plus" }, changed: true }));
  vi.stubGlobal("fetch", fetcher);
  render(<AdminSales initialProducts={[]} tiers={tiers} canChangeLevel />);
  fireEvent.change(screen.getByLabelText("Buscar por RUT"), { target: { value: "12.345.678-5" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar cliente" }));
  await screen.findByText("Camila Ejemplo");
  fireEvent.click(screen.getByRole("button", { name: "Subir de nivel" }));
  fireEvent.click(await screen.findByRole("radio", { name: /Star Plus/ }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar nivel" }));
  const summary = within(screen.getByRole("complementary", { name: "Resumen para la venta" }));
  await summary.findByText("Star Plus");
  expect(summary.getByText(expected)).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continuar a producto" }));
  expect(screen.getByLabelText("Producto o paquete", { exact: true })).toBeInTheDocument();
  expect(within(screen.getByRole("complementary", { name: "Resumen para la venta" })).getByText("Star Plus")).toBeInTheDocument();
 });

});
