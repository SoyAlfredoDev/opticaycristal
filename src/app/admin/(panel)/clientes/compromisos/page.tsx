import Link from "next/link";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminCommitmentSettings } from "@/components/clients/AdminCommitments";
import { customerAdminSession,canManageProductCosts } from "@/lib/clients/admin";
import { contractSettingsSummary } from "@/lib/clients/commitments";
import styles from "@/components/clients/ClientSpace.module.css";
export const dynamic="force-dynamic";
export default async function CommitmentsPage(){
 const staff=await customerAdminSession();if(!staff)return <AdminAccessDenied/>;
 let initial=null,unavailable=false;
 const owner=canManageProductCosts(staff.u);
 if(owner){try{initial=await contractSettingsSummary();}catch{unavailable=true;}}
 return <main className={`${styles.main} ${styles.space}`} id="contenido-principal"><h1>Compromisos de pago</h1><p>Genera el documento desde una venta a crédito y entrégalo al cliente para firma presencial.</p><Link href="/admin/clientes/ventas">Ir a ventas</Link>{owner?<AdminCommitmentSettings initial={initial} unavailable={unavailable}/>:<p>El responsable de la óptica administra la firma preimpresa y los medios de pago.</p>}</main>;
}
