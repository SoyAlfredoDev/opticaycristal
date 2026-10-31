import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({ loaded:vi.fn() }));
vi.mock("next/navigation",()=>({usePathname:()=>"/mi-cuenta"}));
vi.mock("./JornadaRequestModal",()=>{mock.loaded();return {default:({open,onClose}:{open:boolean;onClose:()=>void})=>open?<div role="dialog" aria-label="Solicitud de jornada"><button onClick={onClose}>Cerrar solicitud</button></div>:null};});
import { JornadaModalProvider,useJornadaModal } from "./JornadaModalProvider";
function Button(){const {open}=useJornadaModal();return <button onClick={open}>Solicitar jornada</button>;}
it("no carga el formulario comercial al entrar al panel y conserva su apertura y cierre bajo demanda",async()=>{
 render(<JornadaModalProvider><Button/></JornadaModalProvider>);
 expect(mock.loaded).not.toHaveBeenCalled();
 await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Solicitar jornada"})));
 expect(mock.loaded).toHaveBeenCalledOnce();expect(screen.getByRole("dialog",{name:"Solicitud de jornada"})).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"Cerrar solicitud"}));expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
 await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Solicitar jornada"})));expect(mock.loaded).toHaveBeenCalledOnce();
});
