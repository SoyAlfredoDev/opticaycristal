import Link from "next/link";
import {webpayAvailable} from "@/lib/webpay/sdk";
import { CustomerSales } from "@/components/clients/CustomerSales";
import styles from "@/components/clients/ClientSpace.module.css";
export default function Page() { return <><h1>Mis cuotas</h1><p className={styles.muted}>Cuotas mensuales, pagos y saldo pendiente.</p>{webpayAvailable()&&<p><Link href="/mi-cuenta/pagos" className={styles.textLink}>Mis pagos Webpay</Link></p>}<CustomerSales installmentsOnly={true} /></>; }
