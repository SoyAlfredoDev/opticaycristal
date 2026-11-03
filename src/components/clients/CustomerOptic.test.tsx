import { render,screen } from "@testing-library/react";
import { afterEach,describe,expect,it,vi } from "vitest";
const state=vi.hoisted(()=>({photos:[] as Array<{src:string;alt:string}>}));
vi.mock("@/components/site/content",async original=>({...await original<typeof import("@/components/site/content")>(),get storePhotos(){return state.photos;}}));
import { CustomerOptic } from "./CustomerOptic";
import { storeMapUrl } from "@/components/site/content";
afterEach(()=>{state.photos=[];});
describe("La óptica en el portal del cliente",()=>{
 it("muestra la dirección compartida, un mapa y rutas sin transmitir la página privada como referencia",()=>{
  render(<CustomerOptic/>);expect(screen.getByRole("heading",{name:"Huérfanos 713"})).toBeVisible();expect(screen.getByText("Local 18")).toBeVisible();expect(screen.getByText("Local 18").closest("address")).toHaveTextContent("Local 18 · Santiago Centro");
  const map=screen.getByTitle("Mapa de Óptica & Cristal, Huérfanos 713, local 18, Santiago Centro");expect(map).toHaveAttribute("src",storeMapUrl("embed",15));expect(map).toHaveAttribute("referrerpolicy","no-referrer");expect(map).toHaveAttribute("loading","lazy");expect(screen.getByRole("link",{name:"Cómo llegar"})).toHaveAttribute("href",storeMapUrl("directions"));
 });
 it("conecta Instagram, WhatsApp y correo y ofrece fotos sin presentar imágenes referenciales como reales",()=>{
  render(<CustomerOptic/>);expect(screen.getByRole("link",{name:/Instagram @opticaycristal.cl/})).toHaveAttribute("href","https://www.instagram.com/opticaycristal.cl/");expect(screen.getByRole("link",{name:/WhatsApp \+56/})).toHaveAttribute("href",expect.stringContaining("https://wa.me/56922452080"));expect(screen.getByRole("link",{name:/Correo electrónico/})).toHaveAttribute("href","mailto:contacto@opticaycristal.cl");expect(screen.getByRole("link",{name:"Explorar fotos"})).toHaveAttribute("href","https://www.instagram.com/opticaycristal.cl/");expect(screen.queryByRole("img")).not.toBeInTheDocument();
 });
 it("muestra y permite ampliar únicamente las fotos reales configuradas",()=>{
  state.photos=[{src:"/images/local/prueba.jpg",alt:"Vista del local de prueba"}];render(<CustomerOptic/>);expect(screen.getByRole("img",{name:"Vista del local de prueba"})).toBeVisible();expect(screen.getByRole("link",{name:"Ampliar foto: Vista del local de prueba"})).toHaveAttribute("href","/images/local/prueba.jpg");expect(screen.queryByRole("link",{name:"Explorar fotos"})).not.toBeInTheDocument();
 });
});
