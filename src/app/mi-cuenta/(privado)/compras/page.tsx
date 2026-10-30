import { currentCustomer } from "@/lib/clients/current";
import { SalesHistory } from "@/components/clients/SalesHistory";
import styles from "@/components/clients/ClientSpace.module.css";
export default async function Page(){const c=await currentCustomer();return <><h1>Mis compras</h1><p className={styles.muted}>Historial y documentos de tus compras.</p><SalesHistory sales={c.purchases} installmentsOnly={false}/></>;}
