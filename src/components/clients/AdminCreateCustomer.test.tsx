import {fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {AdminClients} from "./AdminClients";
import {AdminSales} from "./AdminSales";

vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});

it.each(["Clientes","Registrar venta"])("permite dar de alta desde %s sin verificaciones previas",async view=>{
  const request=vi.fn(async (url:string)=>Response.json(url.endsWith("/crear")?
    {customerId:"test-id",created:true,invitationSent:true}:
    {hasMore:false,customers:[],customer:{id:"test-id",firstName:"Prueba",lastName:"Cliente",rut:"12345678-5",email:"test@example.com",tier:{name:"Start"}}}));
  vi.stubGlobal("fetch",request);
  render(view==="Clientes"?<AdminClients initialCustomers={[]} seller/>:<AdminSales initialProducts={[]}/>);
  fireEvent.click(screen.getByRole("button",{name:"Crear cliente"}));
  const form=within(screen.getByRole("form",{name:"Crear cliente"}));
  for(const [label,value] of Object.entries({RUT:"12345678-5",Nombre:"Prueba",Apellido:"Cliente","Correo electrónico":"test@example.com",WhatsApp:"+56900000001"})){
    fireEvent.change(form.getByLabelText(label,{exact:true}),{target:{value}});
  }
  fireEvent.click(form.getByRole("checkbox"));
  fireEvent.click(form.getByRole("button",{name:"Guardar cliente"}));
  expect(await screen.findByText("Enlace de acceso enviado.")).toBeInTheDocument();
  if(view==="Registrar venta")expect(await screen.findByRole("button",{name:"Continuar"})).toBeEnabled();
  else expect(screen.getByRole("link",{name:"Ver ficha"})).toHaveAttribute("href","/admin/clientes/test-id");
});
