"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, Calculator, ChartNoAxesCombined, ChevronRight, ClipboardList, CreditCard, FileSignature,
  Layers, LifeBuoy, LogOut, Menu, Package, Radio, ShoppingBag, Users, X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { AdminMemory } from "./AdminMemory";
import { AdminNotificationBell } from "./AdminNotifications";
import styles from "./AdminShell.module.css";

const groups = [
  { label: "Operación", links: [
    { href: "/admin/clientes/ventas", label: "Ventas", icon: ShoppingBag, customers: true, seller: true },
    { href: "/admin/clientes", label: "Clientes", icon: Users, customers: true, seller: true },
    { href: "/admin/clientes/simulador", label: "Simulador de crédito", icon: Calculator, customers: true, seller: true },
    { href: "/admin/clientes/compromisos", label: "Compromisos", icon: FileSignature, customers: true, seller: false },
    { href: "/admin/webpay", label: "Cobros Webpay", icon: CreditCard, customers: true, seller: false },
    { href: "/admin/pedidos", label: "Pedidos web", icon: Package, customers: false, seller: false },
  ] },
  { label: "Gestión", links: [
    { href: "/admin/indicadores", label: "Indicadores", icon: ChartNoAxesCombined, customers: true, seller: false },
    { href: "/admin", label: "Solicitudes", icon: ClipboardList, customers: false, seller: false },
    { href: "/admin/encuestas", label: "Encuestas", icon: ClipboardList, customers: true, seller: false },
    { href: "/admin/clientes/soporte", label: "Soporte", icon: LifeBuoy, customers: true, seller: false },
    { href: "/admin/radar", label: "Radar B2B", icon: Radio, customers: false, seller: false },
    { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell, customers: false, seller: false },
  ] },
  { label: "Configuración", links: [
    { href: "/admin/clientes/niveles", label: "Niveles y beneficios", icon: Layers, customers: true, seller: false },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users, customers: false, seller: false },
  ] },
];

export function AdminShell({ children, allowCustomers, seller = false, fontClass = "" }: {
  children: ReactNode;
  allowCustomers: boolean;
  seller?: boolean;
  fontClass?: string;
}) {
  const path = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = drawer.current;
    if (!open) {
      if (element?.open) element.close();
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    const desktop = window.matchMedia?.("(min-width: 801px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    desktop?.addEventListener("change", closeOnDesktop);
    return () => {
      desktop?.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (path.endsWith("/compromiso")) return <>{children}</>;

  const current = groups.flatMap(group => group.links)
    .filter(link => path === link.href || (link.href !== "/admin" && path.startsWith(link.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const availableGroups = groups.map(group => ({
    ...group,
    links: group.links.filter(link => (!link.customers || allowCustomers) && (!seller || link.seller)),
  })).filter(group => group.links.length);
  const currentLabel = availableGroups.flatMap(group => group.links).find(link => link.href === current?.href)?.label ?? "Panel";

  function navigation(mobile = false) {
    return <>
      <nav className={styles.navigation} aria-label={mobile ? "Menú administrativo móvil" : "Menú administrativo"}>
        {availableGroups.map(group => <div key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          <ul>
            {group.links.map(link => <li key={link.href}>
              <Link href={link.href} aria-current={current?.href === link.href ? "page" : undefined}
                onClick={() => setOpen(false)}>
                <link.icon size={17} aria-hidden="true" />
                {link.label}
              </Link>
            </li>)}
          </ul>
        </div>)}
      </nav>
      <form action={logoutAction} className={styles.logoutForm}>
        <button type="submit" className={styles.logout}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button>
      </form>
    </>;
  }

  function identity(mobile = false) {
    return <Link href={seller ? "/admin/clientes/ventas" : "/admin"} className={styles.brand}
      aria-label="Óptica y Cristal Administración" onClick={() => setOpen(false)}>
      <Image src="/images/home/oc-logo-oficial.png" alt="Óptica y Cristal" width={124} height={61}
        unoptimized priority={!mobile} />
      {!mobile && <span>Panel administrativo</span>}
    </Link>;
  }

  return <AdminMemory>
    <div className={`${styles.shell} ${fontClass}`} data-admin-shell>
      <aside className={styles.sidebar}>{identity()}{navigation()}</aside>
      <div className={styles.content}>
        <header className={styles.topBar}>
          <button type="button" className={styles.menuButton} aria-controls="admin-mobile-menu"
            aria-label="Abrir menú administrativo" aria-expanded={open} aria-haspopup="dialog"
            onClick={() => setOpen(true)}><Menu size={22} aria-hidden="true" /></button>
          <div className={styles.location} aria-label="Ubicación actual">
            <span className={styles.area}>Administración</span><ChevronRight size={14} aria-hidden="true" />
            <strong>{currentLabel}</strong>
            {path.startsWith("/admin/clientes/") && current?.href === "/admin/clientes" &&
              <><ChevronRight size={14} aria-hidden="true" /><span>Ficha del cliente</span></>}
          </div>
          {!seller && <div className={styles.notices}><AdminNotificationBell /></div>}
        </header>
        {children}
      </div>
      <dialog id="admin-mobile-menu" ref={drawer} className={styles.drawer} aria-labelledby="admin-menu-title"
        onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
        onClick={event => {
          if (event.target === event.currentTarget && event.clientX > event.currentTarget.getBoundingClientRect().right)
            setOpen(false);
        }}>
        <div className={styles.drawerHeader}>
          <h2 id="admin-menu-title">Administración</h2>
          <button type="button" aria-label="Cerrar menú administrativo" onClick={() => setOpen(false)} autoFocus>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {identity(true)}
        {navigation(true)}
      </dialog>
    </div>
  </AdminMemory>;
}
