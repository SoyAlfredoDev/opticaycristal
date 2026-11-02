import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminLevels } from "@/components/clients/AdminLevels";
import { customerAdminSession, canManageCustomerCategories } from "@/lib/clients/admin";
import { getLevelSettings } from "@/lib/clients/levels";
import styles from "@/components/clients/ClientSpace.module.css";

export const dynamic = "force-dynamic";
export default async function LevelsPage() {
  const staff = await customerAdminSession();
  if (!staff) return <AdminAccessDenied />;
  const settings = await getLevelSettings();
  return <main className={`${styles.main} ${styles.space}`} id="contenido-principal">
    <div className={styles.adminHead}><div><h1>Niveles y beneficios</h1><p className={styles.muted}>Configura el financiamiento de cada nivel y consulta quién modificó sus beneficios.</p></div></div>
    <AdminLevels initial={settings} canEdit={canManageCustomerCategories(staff.u)} />
  </main>;
}
