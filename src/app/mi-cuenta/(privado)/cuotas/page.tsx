import { CustomerSales } from "@/components/clients/CustomerSales";
import styles from "@/components/clients/ClientSpace.module.css";
export default function Page() { return <><h1>Mis cuotas</h1><p className={styles.muted}>Cuotas mensuales, pagos y saldo pendiente.</p><CustomerSales installmentsOnly={true} /></>; }
