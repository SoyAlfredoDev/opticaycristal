"use client";
import Link from "next/link";
import styles from "@/components/clients/ClientSpace.module.css";
export default function CustomerError({reset}: {reset:()=>void}) {return <main className={styles.main} id="contenido-principal"><h1>No pudimos cargar tu espacio</h1><p>La cuenta no está disponible temporalmente. No se ha modificado tu información.</p><div className={styles.actions}><button className={styles.button} onClick={reset}>Volver a intentar</button><Link className={styles.button} href="/mi-cuenta/ingresar">Ir al acceso</Link></div></main>;}
