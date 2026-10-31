import { CustomerSales } from "@/components/clients/CustomerSales";
import styles from "@/components/clients/ClientSpace.module.css";
export default function Page() { return <><h1>Mis compras</h1><p className={styles.muted}>Historial y documentos de tus compras.</p><CustomerSales installmentsOnly={false} /></>; }
