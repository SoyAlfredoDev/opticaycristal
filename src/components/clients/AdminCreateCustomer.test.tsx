import {fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {AdminClients} from "./AdminClients";
import {AdminSales} from "./AdminSales";

vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
afterEach(()=>{vi.unstubAllGlobals();sessionStorage.clear();});

const saved={customerId:"test-id",created:true,invitationSent:true};
const customer={id:"test-id",firstName:"Prueba",lastName:"Cliente",rut:"12345678-5",email:"test@example.com",
    emailVerified:true,whatsapp:"+56900000001",whatsappVerificationAvailable:true,tier:{name:"Start"},purchaseCount:0,
    credit:{available:40000,capacity:40000,enabled:true,principalOutstanding:0}};

function fillCustomerForm() {
    fireEvent.click(screen.getByRole("button",{name:"Crear cliente"}));
    const form=within(screen.getByRole("form",{name:"Crear cliente"}));
    for(const [label,value] of Object.entries({RUT:customer.rut,Nombre:"Prueba",Apellido:"Cliente","Correo electrónico":customer.email,WhatsApp:customer.whatsapp})){
        fireEvent.change(form.getByLabelText(label,{exact:true}),{target:{value}});
    }
    fireEvent.click(form.getByRole("checkbox"));
    return form;
}

it("conserva el alta y envío de enlace desde la vista Clientes",async()=>{
    vi.stubGlobal("fetch",vi.fn(async(url:string)=>Response.json(url.endsWith("/crear")?saved:{hasMore:false,customers:[]})));
    render(<AdminClients initialCustomers={[]} seller/>);
    fireEvent.click(fillCustomerForm().getByRole("button",{name:"Guardar cliente"}));
    expect(await screen.findByText("Enlace de acceso enviado.")).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Ver ficha"})).toHaveAttribute("href","/admin/clientes/test-id");
});

it("en ventas verifica correo, muestra la ficha y permite continuar con WhatsApp pendiente",async()=>{
    const request=vi.fn(async(url:string, init:RequestInit)=>{
        const body=JSON.parse(String(init.body));
        if(url.endsWith("/alta"))return Response.json(body.action==="send"?{requestId:"email-request"}:saved);
        if(url.endsWith("/verificar-whatsapp"))return Response.json({requestId:"whatsapp-request",resendAfterSeconds:60});
        return Response.json({customer});
    });
    vi.stubGlobal("fetch",request);
    render(<AdminSales initialProducts={[]}/>);
    const form=fillCustomerForm();
    fireEvent.click(form.getByRole("button",{name:"Enviar código al correo"}));
    fireEvent.change(await form.findByLabelText("Código del correo"),{target:{value:"0042"}});
    fireEvent.click(form.getByRole("button",{name:"Validar correo y crear cliente"}));
    expect(await screen.findByText("Enlace de acceso enviado.")).toBeInTheDocument();
    expect(JSON.parse(String(request.mock.calls[1][1].body))).toMatchObject({action:"create",requestId:"email-request",code:"0042"});
    expect(await screen.findByText("Sin compras")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Continuar a producto"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button",{name:"Enviar código por WhatsApp"}));
    expect(await screen.findByRole("button",{name:/Reenviar en (59|60) s/})).toBeDisabled();
    expect(screen.getByLabelText("Código de WhatsApp")).toBeInTheDocument();
});

it("avisa sobre un RUT inválido y permite continuar desde la ficha de un pasaporte existente",async()=>{
    const passportCustomer={...customer,rut:"",document:{type:"passport",number:"AB123456",country:"PE"}};
    const request=vi.fn(async(_url:string,init:RequestInit)=>{
        const body=JSON.parse(String(init.body));
        return Response.json(body.action==="check-document"?{customerId:customer.id}:{customer:passportCustomer});
    });
    vi.stubGlobal("fetch",request);
    render(<AdminSales initialProducts={[]}/>);
    const form=fillCustomerForm();
    const rut=form.getByLabelText("RUT",{exact:true});
    fireEvent.change(rut,{target:{value:"12.345.678-9"}});
    fireEvent.blur(rut);
    expect(await form.findByRole("alert")).toHaveTextContent(/dígito verificador/);
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(form.getByRole("combobox",{name:"Tipo de documento"}),{target:{value:"passport"}});
    fireEvent.change(form.getByRole("combobox",{name:"País emisor"}),{target:{value:"PE"}});
    const number=form.getByLabelText("Número de documento",{exact:true});
    fireEvent.change(number,{target:{value:"AB-123456"}});
    fireEvent.blur(number);
    expect(await form.findByText("Este documento ya tiene una ficha registrada.")).toBeInTheDocument();
    expect(form.queryByRole("button",{name:"Enviar código al correo"})).not.toBeInTheDocument();
    fireEvent.click(form.getByRole("button",{name:"Usar ficha existente"}));
    expect(await screen.findByText("Pasaporte AB123456 (PE)")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Continuar a producto"})).toBeEnabled();
    expect(request.mock.calls.map(([,init])=>JSON.parse(String(init.body)).action)).toEqual(["check-document","lookup"]);
});
