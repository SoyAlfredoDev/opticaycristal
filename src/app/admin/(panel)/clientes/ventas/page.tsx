import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { customerAdminSession } from "@/lib/clients/admin";
import { listSaleProducts } from "@/lib/clients/sales";
import { contractSettingsSummary } from "@/lib/clients/commitments";
import { AdminSales } from "@/components/clients/AdminSales";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic="force-dynamic";
export default async function SalesPage(){const staff=await customerAdminSession();if(!staff)return <AdminAccessDenied/>;const [products,settings]=await Promise.all([listSaleProducts(),contractSettingsSummary()]);return <div className={styles.space}><main className={styles.main} id="contenido-principal"><AdminSales initialProducts={products} contractReady={Boolean(settings?.signatureConfigured)}/></main></div>;}
