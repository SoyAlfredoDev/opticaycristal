"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { House, Wallet, ShoppingBag, UserRound, LogOut, CircleHelp } from "lucide-react";
import type { CustomerProfile } from "@/lib/clients/types";
import { ClientBrand } from "./ClientBrand";
import { CustomerHelpChat } from "./CustomerHelpChat";
import styles from "./ClientSpace.module.css";
const links = [{ href: "/mi-cuenta", label: "Inicio", icon: House }, { href: "/mi-cuenta/cuotas", label: "Cuotas", icon: Wallet }, { href: "/mi-cuenta/compras", label: "Compras", icon: ShoppingBag }, { href: "/mi-cuenta/perfil", label: "Perfil", icon: UserRound }];
export function CustomerShell({ customer, children }: { customer: Pick<CustomerProfile,"firstName" | "lastName">; children: ReactNode }) {
  const path = usePathname(), router = useRouter();const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function logout() { setBusy(true);try { const response = await fetch("/api/clientes/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });if (!response.ok) throw new Error();router.replace("/mi-cuenta/ingresar");router.refresh(); } catch { setError("No pudimos cerrar la sesión. Inténtalo nuevamente.");setBusy(false); } }
  const activePath = path === "/mi-cuenta/soporte" ? "/mi-cuenta/perfil" : path;
  if (path.endsWith("/compromiso")) return <>{children}</>;
  return <><ClientBrand initials={`${customer.firstName[0]}${customer.lastName[0]}`} /><div className={styles.workspace}><nav className={styles.side} aria-label="Mi espacio">{links.map(l => <Link key={l.href} href={l.href} aria-current={activePath === l.href ? "page" : undefined} className={`${styles.navLink} ${activePath === l.href ? styles.active : ""}`}><l.icon size={19} aria-hidden="true" />{l.label}</Link>)}<Link className={`${styles.navLink} ${path === "/mi-cuenta/ayuda" ? styles.active : ""}`} aria-current={path === "/mi-cuenta/ayuda" ? "page" : undefined} href="/mi-cuenta/ayuda"><CircleHelp size={19} aria-hidden="true" />Ayuda</Link><div className={styles.sideNote}>Óptica &amp; Cristal<br />Tu óptica, más cerca.</div></nav><main className={styles.main} id="contenido-principal">{error && <p role="alert" className={styles.error}>{error}</p>}{children}{path === "/mi-cuenta/perfil" && <div className={styles.section}><button className={styles.button} onClick={logout} disabled={busy}><LogOut size={17} aria-hidden="true" />{busy ? "Saliendo…" : "Cerrar sesión"}</button></div>}</main></div><nav className={styles.bottom} aria-label="Navegación móvil">{links.map(l => <Link key={l.href} href={l.href} aria-current={activePath === l.href ? "page" : undefined} className={activePath === l.href ? styles.active : ""}><l.icon size={21} aria-hidden="true" />{l.label}</Link>)}</nav><CustomerHelpChat /></>;
}
