import { approvedAgreementModel } from "@/lib/clients/agreement-registry";
import { clientPool } from "@/lib/clients/db";
import { getCustomerTiers } from "@/lib/clients/store";
import { customerAdminSession, canManageCustomerCategories } from "@/lib/clients/admin";
import { listSaleProducts } from "@/lib/clients/sales";
import { contractSettingsSummary } from "@/lib/clients/commitments";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminSales } from "@/components/clients/AdminSales";
import styles from "@/components/clients/ClientSpace.module.css";
import wizard from "@/components/clients/AdminSales.module.css";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const staff = await customerAdminSession(true);
  if (!staff) return <AdminAccessDenied />;
  const hash = process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH;
  const [products, settings, approved, tiers] = await Promise.all([
    listSaleProducts(),
    contractSettingsSummary(),
    hash ? approvedAgreementModel(clientPool(), hash).then(() => true).catch(() => false) : Promise.resolve(true),
    getCustomerTiers(),
  ]);
  const contractReady = Boolean(settings?.signatureConfigured && (!hash || settings.representativeAuthority) && approved);
  return <div className={styles.space}><main className={wizard.workspace} id="contenido-principal">
    <AdminSales initialProducts={products} contractReady={contractReady} tiers={tiers}
      canChangeLevel={staff.role !== "seller" && canManageCustomerCategories(staff.u)} />
  </main></div>;
}
