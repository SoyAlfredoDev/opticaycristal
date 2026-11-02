"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { CustomerCategories } from "./CustomerCategories";
import styles from "./CustomerCategories.module.css";
const CategoryContext = createContext<(() => void) | null>(null);
export function CategoryModalProvider({tiers,currentCategory,children}:{tiers:CustomerProfile["tier"][];currentCategory:string;children:ReactNode}) {
 const [manualOpen,setOpen]=useState(false), dialog=useRef<HTMLDialogElement>(null);
 const search=useSearchParams(), router=useRouter(), path=usePathname();
 const requested=search.get("categorias")==="1", open=manualOpen||requested;
 useEffect(()=>{
  const element=dialog.current;
  if(!open){if(element?.open)element.close();return;}
  const previous=document.body.style.overflow;
  document.body.style.overflow="hidden";
  if(!element?.open)element?.showModal();
  return ()=>{document.body.style.overflow=previous;};
 },[open]);
 function close(){setOpen(false);if(requested){const query=new URLSearchParams(search.toString());query.delete("categorias");router.replace(`${path}${query.size?`?${query}`:""}`,{scroll:false});}}
 return <CategoryContext.Provider value={()=>setOpen(true)}>{children}<dialog ref={dialog} className={styles.modal} aria-labelledby="category-modal-title" onCancel={event=>{event.preventDefault();close();}} onClose={close} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();}}>
  {open&&<><header className={styles.modalHeader}><div><p>CRÉDITO DIRECTO</p><h2 id="category-modal-title">Encuentra tu siguiente nivel</h2><span>Conoce los beneficios de cada nivel.</span></div><button type="button" className={styles.close} aria-label="Cerrar niveles" onClick={close} autoFocus><X size={22} aria-hidden="true"/></button></header><CustomerCategories tiers={tiers} currentCategory={currentCategory} embedded/></>}
 </dialog></CategoryContext.Provider>;
}
export function CategoryTrigger({children,className,label}:{children:ReactNode;className?:string;label?:string}) {
 const show=useContext(CategoryContext);
 return <button type="button" className={`${styles.trigger} ${className??""}`} aria-haspopup="dialog" aria-label={label} onClick={()=>show?.()}>{children}</button>;
}
