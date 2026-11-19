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
it("muestra pendiente solo para créditos vigentes y reconoce copias ya cargadas",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({sales:[sale,{...sale,id:"cash",credit:0},{...sale,id:"cancelled",status:"cancelled"},{...sale,id:"ready",commitmentFile:{source:"signed",uploadedBy:"administrador QA",uploadedAt:"2026-11-18T15:00:00Z"}}],hasMore:false})));
 render(<AdminSalesRegister/>);
 expect(await screen.findByText("Compromiso pendiente")).toBeInTheDocument();
 expect(screen.getAllByRole("button",{name:"Subir compromiso"})).toHaveLength(1);
 expect(screen.getByText("No aplica")).toBeInTheDocument();expect(screen.getByText("Venta anulada")).toBeInTheDocument();
 expect(screen.getByText("Documento cargado")).toBeInTheDocument();expect(screen.getByText(/administrador QA/)).toBeInTheDocument();
 expect(screen.getByRole("link",{name:"Ver compromiso"})).toHaveAttribute("href","/api/admin/clientes/ventas/ready/compromiso/archivo");
});
it("sube desde la lista y actualiza el indicador sin recargar ni marcar firma",async()=>{
 const file={source:"upload",uploadedBy:"vendedor QA",uploadedAt:"2026-11-18T15:00:00Z",pages:2};
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>Response.json(init?.method==="POST"?{file}:{sales:[sale],hasMore:false}));
 vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);
 fireEvent.click(await screen.findByRole("button",{name:"Subir compromiso"}));
 expect(screen.getByRole("dialog",{name:"Subir compromiso de pago"})).toBeVisible();
 expect(screen.getByRole("button",{name:"Guardar documento"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Documento firmado"),{target:{files:[new File(["%PDF-example"],"signed.pdf",{type:"application/pdf"})]}});
 fireEvent.click(screen.getByRole("button",{name:"Guardar documento"}));
 expect(await screen.findByText("Documento cargado")).toBeInTheDocument();expect(screen.queryByText("Compromiso pendiente")).not.toBeInTheDocument();
 expect(fetcher).toHaveBeenCalledTimes(2);const body=fetcher.mock.lastCall?.[1]?.body as FormData;
 expect(body.getAll("files")).toHaveLength(1);expect(body.get("requestKey")).toMatch(/^[0-9a-f-]{36}$/);
 expect(screen.queryByText("Firma validada")).not.toBeInTheDocument();
});
it("conserva el pendiente y la clave de reintento si falla el guardado",async()=>{
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>init?.method==="POST"?Response.json({error:"No pudimos guardar el documento."},{status:503}):Response.json({sales:[sale],hasMore:false}));
 vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);fireEvent.click(await screen.findByRole("button",{name:"Subir compromiso"}));
 fireEvent.change(screen.getByLabelText("Documento firmado"),{target:{files:[new File(["%PDF-example"],"signed.pdf",{type:"application/pdf"})]}});
 fireEvent.click(screen.getByRole("button",{name:"Guardar documento"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");expect(screen.getByText("Compromiso pendiente")).toBeInTheDocument();
 const key=(fetcher.mock.lastCall?.[1]?.body as FormData).get("requestKey");
 fireEvent.click(screen.getByRole("button",{name:"Guardar documento"}));await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(3));
 expect((fetcher.mock.lastCall?.[1]?.body as FormData).get("requestKey")).toBe(key);
});
it("no envía un PDF demasiado grande",async()=>{
 const fetcher=vi.fn(async()=>Response.json({sales:[sale],hasMore:false}));vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);
 fireEvent.click(await screen.findByRole("button",{name:"Subir compromiso"}));
 fireEvent.change(screen.getByLabelText("Documento firmado"),{target:{files:[new File([new Uint8Array(3*1024*1024+1)],"large.pdf",{type:"application/pdf"})]}});
 fireEvent.click(screen.getByRole("button",{name:"Guardar documento"}));expect(await screen.findByRole("alert")).toHaveTextContent("3 MB");expect(fetcher).toHaveBeenCalledTimes(1);
});
it("impide enviar dos veces y cerrar el formulario mientras se guarda",async()=>{
 let finish!:(response:Response)=>void;
 const pending=new Promise<Response>(resolve=>{finish=resolve;});
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>init?.method==="POST"?pending:Response.json({sales:[sale],hasMore:false}));
 vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);fireEvent.click(await screen.findByRole("button",{name:"Subir compromiso"}));
 fireEvent.change(screen.getByLabelText("Documento firmado"),{target:{files:[new File(["%PDF-example"],"signed.pdf",{type:"application/pdf"})]}});
 const button=screen.getByRole("button",{name:"Guardar documento"});fireEvent.click(button);fireEvent.click(button);
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(screen.getByRole("button",{name:"Cancelar"})).toBeDisabled();expect(screen.getByRole("button",{name:"Cerrar"})).toBeDisabled();
 finish(Response.json({file:{source:"upload",uploadedBy:"QA",uploadedAt:"2026-11-18T15:00:00Z",pages:2}}));
 expect(await screen.findByText("Documento cargado")).toBeInTheDocument();
});
it("informa fallos de conexión en español y mantiene el documento pendiente",async()=>{
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{if(init?.method==="POST")throw new TypeError("Failed to fetch");return Response.json({sales:[sale],hasMore:false});});
 vi.stubGlobal("fetch",fetcher);render(<AdminSalesRegister/>);fireEvent.click(await screen.findByRole("button",{name:"Subir compromiso"}));
 fireEvent.change(screen.getByLabelText("Documento firmado"),{target:{files:[new File(["%PDF-example"],"signed.pdf",{type:"application/pdf"})]}});fireEvent.click(screen.getByRole("button",{name:"Guardar documento"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");expect(screen.getByText("Compromiso pendiente")).toBeInTheDocument();
});
