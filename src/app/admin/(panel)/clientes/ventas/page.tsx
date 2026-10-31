import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { customerAdminSession,canManageProductCosts } from "@/lib/clients/admin";
import { listSaleProducts } from "@/lib/clients/sales";
import { AdminSales } from "@/components/clients/AdminSales";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic="force-dynamic";
export default async function SalesPage(){const staff=await customerAdminSession();if(!staff)return <AdminAccessDenied/>;return <div className={styles.space}><main className={styles.main} id="contenido-principal"><AdminSales canManageCosts={canManageProductCosts(staff.u)} initialProducts={await listSaleProducts()}/></main></div>;}
