import { approvedAgreementModel } from "@/lib/clients/agreement-registry";
import {clientPool} from "@/lib/clients/db";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { customerAdminSession } from "@/lib/clients/admin";
import { listSaleProducts } from "@/lib/clients/sales";
import { contractSettingsSummary } from "@/lib/clients/commitments";
import { AdminSales } from "@/components/clients/AdminSales";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic="force-dynamic";
export default async function SalesPage(){const staff=await customerAdminSession(true);if(!staff)return <AdminAccessDenied/>;const hash=process.env.CLIENT_DIGITAL_AGREEMENT_MODEL_HASH;const [products,settings,approved]=await Promise.all([listSaleProducts(),contractSettingsSummary(),hash?approvedAgreementModel(clientPool(),hash).then(()=>true).catch(()=>false):Promise.resolve(true)]);return <div className={styles.space}><main className={styles.main} id="contenido-principal"><AdminSales initialProducts={products} contractReady={Boolean(settings?.signatureConfigured&&(!hash||settings.representativeAuthority)&&approved)}/></main></div>;}
