import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
import {AdminSalesRegister} from "./AdminSalesRegister";
afterEach(()=>vi.unstubAllGlobals());
const sale={id:"sale",customerId:"client",customerName:"Cliente Ejemplo",productName:"Lente óptico",total:100000,credit:60000,deposit:40000,remaining:60000,status:"active",createdAt:"2026-11-18T15:00:00Z",controlNumber:"CR-0000001",controlVersion:"1",creditOverride:{reason:"Condición comercial acordada",standardCredit:40000,appliedCredit:60000,actor:"vendedor QA",createdAt:"2026-11-18T15:00:00Z"}};
it("muestra el control automático sin edición, busca y pagina con el mismo filtro",async()=>{
 const fetcher=vi.fn<(url:string)=>Promise<Response>>(async()=>Response.json({sales:[sale],hasMore:true}));vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);
 expect(await screen.findByText("CR-0000001")).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Editar control|Asignar control/})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("Buscar por cliente, producto o control"),{target:{value:"CR-0000001"}});fireEvent.click(screen.getByRole("button",{name:"Buscar"}));
 await waitFor(()=>expect(fetcher.mock.lastCall?.[0]).toContain("q=CR-0000001&offset=0"));
 fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));await waitFor(()=>expect(fetcher.mock.lastCall?.[0]).toContain("q=CR-0000001&offset=25"));
});
it("permite revisar motivo, responsable y montos de la excepción",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({sales:[sale],hasMore:false})));render(<AdminSalesRegister seller/>);
 fireEvent.click(await screen.findByText("Cupo máximo aplicado"));expect(screen.getByText("Condición comercial acordada")).toBeVisible();
 expect(screen.getByText(/Por nivel: \$40.000 · Aplicado: \$60.000/)).toBeVisible();expect(screen.getByText(/vendedor QA/)).toBeVisible();
});
