"use client";
import Link from "next/link";
import styles from "@/components/clients/ClientSpace.module.css";
export default function AdminCustomersError({retry}:{retry:()=>void}){return <main className={styles.main} id="contenido-principal"><h1>No se pudo cargar el registro de clientes</h1><p>Tu sesión puede seguir activa. Intenta cargar esta sección nuevamente.</p><div className={styles.actions}><button className={styles.button} onClick={retry}>Reintentar</button><Link className={styles.button} href="/admin">Volver a administración</Link></div></main>;}
