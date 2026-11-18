import { customerAdminSession } from "@/lib/clients/admin";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminSalesRegister } from "@/components/clients/AdminSalesRegister";
import styles from "@/components/clients/ClientSpace.module.css";
import wizard from "@/components/clients/AdminSales.module.css";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const staff = await customerAdminSession(true);
  if (!staff) return <AdminAccessDenied />;
  return <div className={styles.space}><main className={wizard.workspace} id="contenido-principal">
    <AdminSalesRegister seller={staff.role === "seller"} />
  </main></div>;
}
