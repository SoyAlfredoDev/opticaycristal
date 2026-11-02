import { afterEach,expect,it,vi } from "vitest";
import { render,screen,fireEvent } from "@testing-library/react";
import { AdminCreditSimulator } from "./AdminCreditSimulator";
const tiers=[{code:"start",name:"Start",maxAmount:40000,maxPercent:30,maxInstallments:1},{code:"elite",name:"Élite",maxAmount:150000,maxPercent:70,maxInstallments:4}];
afterEach(()=>vi.unstubAllGlobals());
it("permite nivel manual y elimina una propuesta si se modifica el precio",async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({quote:{mode:"tier",tier:tiers[1],customer:null,total:500000,credit:150000,deposit:350000,installments:[{number:1,dueDate:"2026-12-02",amount:37500}],fingerprint:"qa"}}),{status:200,headers:{"content-type":"application/json"}}));vi.stubGlobal("fetch",fetcher);
 render(<AdminCreditSimulator tiers={tiers} products={[]} firstDueDate="2026-12-02"/>);
 fireEvent.change(screen.getByLabelText("Calcular para"),{target:{value:"tier"}});fireEvent.change(screen.getByLabelText("Nivel"),{target:{value:"elite"}});expect(screen.getByLabelText("Cuotas mensuales")).toHaveValue("4");
 fireEvent.change(screen.getByLabelText("Precio total con IVA"),{target:{value:"500000"}});fireEvent.click(screen.getByRole("button",{name:"Calcular propuesta"}));await screen.findByRole("button",{name:"Descargar propuesta en PDF"});expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({mode:"tier",tierCode:"elite",installmentCount:4});
 fireEvent.change(screen.getByLabelText("Precio total con IVA"),{target:{value:"600000"}});expect(screen.queryByRole("button",{name:"Descargar propuesta en PDF"})).not.toBeInTheDocument();
});
it("calcula por nivel sin pedir costo de producto",async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({quote:{mode:"tier",tier:tiers[0],customer:null,total:45000,credit:13500,deposit:31500,installments:[{number:1,dueDate:"2026-12-02",amount:13500}],fingerprint:"qa"}}),{status:200,headers:{"content-type":"application/json"}}));vi.stubGlobal("fetch",fetcher);
 render(<AdminCreditSimulator tiers={tiers} products={[{id:"variable",name:"Lente Óptico",variableCost:true}]} firstDueDate="2026-12-02"/>);
 fireEvent.change(screen.getByLabelText("Calcular para"),{target:{value:"tier"}});fireEvent.change(screen.getByLabelText("Precio total con IVA"),{target:{value:"45000"}});fireEvent.change(screen.getByLabelText("Producto opcional"),{target:{value:"variable"}});expect(screen.queryByLabelText(/Costo protegido por unidad/)).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Calcular propuesta"}));await screen.findByRole("button",{name:"Descargar propuesta en PDF"});expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({pricingPolicy:"category",productId:"variable"});
});
