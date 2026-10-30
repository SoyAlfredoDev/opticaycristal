import { fireEvent,render,screen,waitFor } from "@testing-library/react";
import { beforeEach,afterEach,describe,expect,it,vi } from "vitest";
const router=vi.hoisted(()=>({replace:vi.fn(),push:vi.fn(),refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
import { AuthForm } from "./AuthForm";
import LoginForm from "@/components/admin/LoginForm";
const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({})})));});
afterEach(()=>vi.unstubAllGlobals());
describe("Accesos desde avisos de soporte",()=>{
 it.each([{value:id,target:`/mi-cuenta/soporte?ticket=${id}`},{value:"https://example.com",target:"/mi-cuenta"}])("cliente conserva un ticket válido y descarta destinos externos: $target",async({value,target})=>{
  render(<AuthForm mode="login" supportTicketId={value}/>);const field=screen.getByLabelText("Correo electrónico");fireEvent.change(field,{target:{value:"prueba@example.com"}});fireEvent.change(screen.getByLabelText("Contraseña"),{target:{value:"solo-prueba"}});fireEvent.submit(field.closest("form")!);await waitFor(()=>expect(router.replace).toHaveBeenCalledWith(target));
 });
 it.each([{value:id,target:`/admin/clientes/soporte?ticket=${id}`},{value:"//example.com",target:"/admin"}])("personal conserva un ticket válido y descarta destinos externos: $target",async({value,target})=>{
  render(<LoginForm supportTicketId={value}/>);const field=screen.getByLabelText("Usuario");fireEvent.change(field,{target:{value:"personal-prueba"}});fireEvent.change(screen.getByLabelText("Contraseña"),{target:{value:"solo-prueba"}});fireEvent.submit(field.closest("form")!);await waitFor(()=>expect(router.push).toHaveBeenCalledWith(target));
 });
});
