import { currentCustomer } from "@/lib/clients/current";
import { SalesHistory } from "@/components/clients/SalesHistory";
import styles from "@/components/clients/ClientSpace.module.css";
export default async function Page(){const c=await currentCustomer();return <><h1>Mis cuotas</h1><p className={styles.muted}>Cuotas mensuales, pagos y saldo pendiente.</p><SalesHistory sales={c.purchases} installmentsOnly={true}/></>;}
