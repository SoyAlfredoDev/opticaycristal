"use client";
import {createContext,useCallback,useContext,useState,type ReactNode} from "react";
type Directory={q:string;offset:number};type Support={status:string;query:string;selectedId:string|null};
const Context=createContext<{directory:Directory;rememberDirectory:(next:Directory)=>void;support:Support;rememberSupport:(next:Support)=>void}|null>(null);
/** Transient memory only: never put customer searches or RUTs in storage or URLs. */
export function AdminMemory({children}:{children:ReactNode}){
 const[directory,setDirectory]=useState<Directory>({q:"",offset:0}),[support,setSupport]=useState<Support>({status:"abierto",query:"",selectedId:null});
 const rememberDirectory=useCallback((next:Directory)=>setDirectory(old=>old.q===next.q&&old.offset===next.offset?old:next),[]);
 const rememberSupport=useCallback((next:Support)=>setSupport(old=>old.status===next.status&&old.query===next.query&&old.selectedId===next.selectedId?old:next),[]);
 return <Context.Provider value={{directory,rememberDirectory,support,rememberSupport}}>{children}</Context.Provider>;
}
export const useAdminMemory=()=>useContext(Context);
