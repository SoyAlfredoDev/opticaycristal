import { fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import type { CategorySettings } from "@/lib/clients/category-types";
const refresh=vi.hoisted(()=>vi.fn());vi.mock("next/navigation",()=>({useRouter:()=>({refresh})}));
import { AdminCustomerCategory } from "./AdminCustomerCategory";
const initial:CategorySettings={currentCategory:"start",tiers:[{code:"start",name:"Start",maxAmount:40000,maxPercent:30,maxInstallments:1},{code:"vip",name:"VIP",maxAmount:60000,maxPercent:40,maxInstallments:1},{code:"premium",name:"Premium",maxAmount:80000,maxPercent:60,maxInstallments:2},{code:"elite",name:"Elite",maxAmount:150000,maxPercent:70,maxInstallments:2}],history:[]};
const reply=(body:unknown,status=200)=>({ok:status<400,status,json:async()=>body});
beforeEach(()=>vi.clearAllMocks());afterEach(()=>vi.unstubAllGlobals());
describe("Cambio manual de categoría",()=>{
 it("guarda la categoría elegida y muestra las condiciones antes de confirmar",async()=>{
  const fetcher=vi.fn<(url:string,options?:RequestInit)=>Promise<ReturnType<typeof reply>>>(async()=>reply({settings:{...initial,currentCategory:"vip"},changed:true,replayed:false}));vi.stubGlobal("fetch",fetcher);render(<AdminCustomerCategory customerId="cliente" initial={initial} canEdit/>);
  expect(screen.getByRole("button",{name:"Guardar categoría"})).toBeDisabled();fireEvent.change(screen.getByLabelText("Categoría"),{target:{value:"vip"}});expect(screen.getByText(/60\.000 de cupo máximo/)).toBeVisible();expect(fetcher).not.toHaveBeenCalled();fireEvent.submit(screen.getByRole("form",{name:"Cambiar categoría"}));await screen.findByText("Categoría actualizada.");expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toMatchObject({category:"vip",expectedCategory:"start",requestKey:expect.any(String)});expect(refresh).toHaveBeenCalled();
 });
 it("no ofrece controles de edición a personal sin permiso",()=>{render(<AdminCustomerCategory customerId="cliente" initial={initial} canEdit={false}/>);expect(screen.queryByRole("combobox")).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"Guardar categoría"})).not.toBeInTheDocument();});
 it("reintenta un fallo de red con la misma clave para no duplicar cambios",async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(reply({settings:{...initial,currentCategory:"vip"},changed:false,replayed:true}));vi.stubGlobal("fetch",fetcher);render(<AdminCustomerCategory customerId="cliente" initial={initial} canEdit/>);fireEvent.change(screen.getByLabelText("Categoría"),{target:{value:"vip"}});fireEvent.submit(screen.getByRole("form",{name:"Cambiar categoría"}));await screen.findByRole("alert");fireEvent.submit(screen.getByRole("form",{name:"Cambiar categoría"}));await screen.findByText("El cambio ya estaba registrado.");expect(JSON.parse(fetcher.mock.calls[0][1].body).requestKey).toBe(JSON.parse(fetcher.mock.calls[1][1].body).requestKey);
 });
 it("recarga el estado al detectar un cambio de otro administrador",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(reply({error:"La categoría cambió mientras editabas."},409)).mockResolvedValueOnce(reply({settings:{...initial,currentCategory:"premium"}}));vi.stubGlobal("fetch",fetcher);render(<AdminCustomerCategory customerId="cliente" initial={initial} canEdit/>);fireEvent.change(screen.getByLabelText("Categoría"),{target:{value:"vip"}});fireEvent.submit(screen.getByRole("form",{name:"Cambiar categoría"}));await screen.findByText("La categoría cambió mientras editabas.");await waitFor(()=>expect(refresh).toHaveBeenCalled());expect(fetcher.mock.calls[1][1]).toMatchObject({cache:"no-store"});
 });
});
