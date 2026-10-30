"use client";
import Link from "next/link";
import styles from "@/components/clients/ClientSpace.module.css";
export default function AdminCustomersError({reset}:{reset:()=>void}){return <main className={styles.main} id="contenido-principal"><h1>No se pudo cargar el registro de clientes</h1><p>Revisa la conexión y que la migración del programa esté aplicada.</p><div className={styles.actions}><button className={styles.button} onClick={reset}>Reintentar</button><Link className={styles.button} href="/admin">Volver a administración</Link></div></main>;}
