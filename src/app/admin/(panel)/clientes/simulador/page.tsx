import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminCreditSimulator } from "@/components/clients/AdminCreditSimulator";
import { customerAdminSession } from "@/lib/clients/admin";
import { getCustomerTiers } from "@/lib/clients/store";
import { listSaleProducts } from "@/lib/clients/sales";
import { defaultSimulationDate } from "@/lib/clients/admin-simulation";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic="force-dynamic";
export default async function SimulatorPage(){
 if(!await customerAdminSession())return <AdminAccessDenied/>;
 const[tiers,products]=await Promise.all([getCustomerTiers(),listSaleProducts()]);
 return <main className={`${styles.main} ${styles.space}`} id="contenido-principal"><h1>Simulador de crédito</h1><p>Consulta el nivel del cliente o prepara un escenario por categoría.</p><AdminCreditSimulator tiers={tiers} products={products.map(({id,name,protectedCost})=>({id,name,variableCost:protectedCost===null}))} firstDueDate={defaultSimulationDate()}/></main>;
}
