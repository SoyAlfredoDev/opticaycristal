"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import styles from "./JornadaModalLoader.module.css";
type ModalProps = { open:boolean; onClose:()=>void; publicStyle?:boolean };
interface JornadaModalContextValue { open:()=>void; close:()=>void; isOpen:boolean }
const JornadaModalContext = createContext<JornadaModalContextValue | null>(null);
// This module promise caches code only. It never contains customer data.
let moduleRequest: Promise<typeof import("./JornadaRequestModal")> | undefined;
export function JornadaModalProvider({ children }: { children:React.ReactNode }) {
  const pathname = usePathname();
  const publicView = ["/", "/optica", "/credito-directo", "/convenios", "/jornadas", "/privacidad"].includes(pathname ?? "");
  const [isOpen,setIsOpen] = useState(false), [error,setError] = useState(false);
  const [Modal,setModal] = useState<ComponentType<ModalProps> | null>(null);
  const open = useCallback(async () => {
    setIsOpen(true); setError(false);
    try {
      const loaded = await (moduleRequest ??= import("./JornadaRequestModal"));
      setModal(() => loaded.default);
    } catch { moduleRequest=undefined; setError(true); }
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open,close,isOpen }), [open,close,isOpen]);
  return <JornadaModalContext.Provider value={value}>{children}
    {Modal ? <Modal open={isOpen} onClose={close} publicStyle={publicView}/> : isOpen ? <PreparingForm error={error} close={close} retry={open}/> : null}
  </JornadaModalContext.Provider>;
}
function PreparingForm({ error,close,retry }: { error:boolean; close:()=>void; retry:()=>void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="preparing-jornada-title" onCancel={event=>{event.preventDefault();close();}}>
    <h2 id="preparing-jornada-title">{error?"No pudimos abrir el formulario":"Preparando tu solicitud"}</h2>
    <p role="status">{error?"Revisa tu conexión e inténtalo de nuevo.":"Un momento…"}</p>
    {error&&<button onClick={retry}>Reintentar</button>} <button autoFocus onClick={close}>Cerrar</button>
  </dialog>;
}
export function useJornadaModal() {
  const context=useContext(JornadaModalContext);
  if(!context) throw new Error("useJornadaModal debe usarse dentro de JornadaModalProvider");
  return context;
}
