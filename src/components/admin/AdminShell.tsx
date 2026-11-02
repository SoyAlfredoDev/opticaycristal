"use client";
import Image from "next/image";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {Menu,X,ClipboardList,Users,ShoppingBag,LifeBuoy,Package,Radio,Bell,LogOut,FileSignature,Calculator,Layers} from "lucide-react";
import {logoutAction} from "@/app/admin/actions";
import {AdminMemory} from "./AdminMemory";
import {AdminNotificationBell} from "./AdminNotifications";
import styles from "./AdminShell.module.css";
const links=[{href:"/admin",label:"Solicitudes",icon:ClipboardList},{href:"/admin/clientes",label:"Clientes",icon:Users,customers:true},{href:"/admin/clientes/niveles",label:"Niveles y beneficios",icon:Layers,customers:true},{href:"/admin/clientes/ventas",label:"Ventas",icon:ShoppingBag,customers:true},{href:"/admin/clientes/simulador",label:"Simulador de crédito",icon:Calculator,customers:true},{href:"/admin/clientes/compromisos",label:"Compromisos",icon:FileSignature,customers:true},{href:"/admin/clientes/soporte",label:"Soporte",icon:LifeBuoy,customers:true},{href:"/admin/pedidos",label:"Pedidos web",icon:Package},{href:"/admin/radar",label:"Radar B2B",icon:Radio},{href:"/admin/notificaciones",label:"Notificaciones",icon:Bell,customers:true}];
function activeRoute(path:string){return links.filter(link=>link.href==="/admin"?path===link.href:path===link.href||path.startsWith(link.href+"/")).sort((a,b)=>b.href.length-a.href.length)[0]?.href;}
export function AdminShell({children,allowCustomers}:{children:ReactNode;allowCustomers:boolean}){
 const path=usePathname(),drawer=useRef<HTMLDialogElement>(null),[open,setOpen]=useState(false);
 useEffect(()=>{const element=drawer.current;if(!open){if(element?.open)element.close();return;}const previous=document.body.style.overflow;document.body.style.overflow="hidden";element?.showModal();return()=>{document.body.style.overflow=previous;};},[open]);
 if(path.endsWith("/compromiso"))return <>{children}</>;
 const current=activeRoute(path),available=links.filter(link=>!link.customers||allowCustomers);
 const navigation=(mobile=false)=><><nav aria-label={mobile?"Menú administrativo móvil":"Menú administrativo"}>{available.map(link=><Link key={link.href} href={link.href} aria-current={current===link.href?"page":undefined} onClick={()=>setOpen(false)}><link.icon size={18} aria-hidden="true"/>{link.label}</Link>)}</nav><form action={logoutAction}><button type="submit" className={styles.logout}><LogOut size={18} aria-hidden="true"/>Cerrar sesión</button></form></>;
 const identity=(mobile=false)=><Link href="/admin" className={styles.brand} aria-label="Óptica y Cristal Administración" onClick={()=>setOpen(false)}><Image src="/images/home/oc-logo-oficial.png" alt="Óptica y Cristal" width={150} height={77} unoptimized priority={!mobile}/>{!mobile&&<span>Administración</span>}</Link>;
 return <AdminMemory><div className={styles.shell} data-admin-shell>
  <button type="button" className={styles.menuButton} aria-controls="admin-mobile-menu" aria-label="Abrir menú administrativo" aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(true)}><Menu size={23} aria-hidden="true"/></button>
  <aside className={styles.sidebar}>{identity()}{allowCustomers&&!open&&<AdminNotificationBell variant="sidebar"/>}{navigation()}</aside>
  <div className={styles.content}><div className={styles.location} aria-label="Ubicación actual">Administración<span aria-hidden="true">/</span>{available.find(item=>item.href===current)?.label??"Panel"}{path.startsWith("/admin/clientes/")&&current==="/admin/clientes"&&<><span aria-hidden="true">/</span>Ficha del cliente</>}</div>{children}</div>
  <dialog id="admin-mobile-menu" ref={drawer} className={styles.drawer} aria-labelledby="admin-menu-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget&&event.clientX>event.currentTarget.getBoundingClientRect().right)setOpen(false);}}><div className={styles.drawerHeader}><h2 id="admin-menu-title">Administración</h2><button type="button" aria-label="Cerrar menú administrativo" onClick={()=>setOpen(false)} autoFocus><X size={22} aria-hidden="true"/></button></div>{identity(true)}{allowCustomers&&open&&<AdminNotificationBell variant="drawer" onNavigate={()=>setOpen(false)}/>}{navigation(true)}</dialog>
 </div></AdminMemory>;
}
