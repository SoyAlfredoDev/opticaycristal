import { render,screen,within } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
const navigation=vi.hoisted(()=>({path:"/mi-cuenta/la-optica"}));
vi.mock("next/navigation",()=>({usePathname:()=>navigation.path,useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
import { CustomerShell } from "./CustomerShell";
afterEach(()=>{navigation.path="/mi-cuenta/la-optica";});
describe("Navegación del portal",()=>{
 it("agrega La óptica en ambos menús y conserva los accesos a cuotas, compras y perfil",()=>{
  render(<CustomerShell customer={{firstName:"Cliente",lastName:"Prueba"}}>Contenido</CustomerShell>);
  for(const name of ["Mi espacio","Navegación móvil"]){const nav=screen.getByRole("navigation",{name});expect(within(nav).getByRole("link",{name:"La óptica"})).toHaveAttribute("aria-current","page");for(const label of ["Inicio","Cuotas","Compras","Perfil"])expect(within(nav).getByRole("link",{name:label})).toBeInTheDocument();}
  expect(within(screen.getByRole("navigation",{name:"Navegación móvil"})).getAllByRole("link")).toHaveLength(5);expect(screen.queryByRole("button",{name:"Cerrar sesión"})).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"Abrir chat de ayuda"})).not.toBeInTheDocument();
 });
 it("conserva una sola acción de salida al final de Perfil",()=>{
  navigation.path="/mi-cuenta/perfil";render(<CustomerShell customer={{firstName:"Cliente",lastName:"Prueba"}}>Contenido</CustomerShell>);expect(screen.getAllByRole("button",{name:"Cerrar sesión"})).toHaveLength(1);
 });
});
