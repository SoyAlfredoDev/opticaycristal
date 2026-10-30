import { notFound, redirect } from "next/navigation";
import { customerAdminSession } from "@/lib/clients/admin";
import { clientPool,clientTable } from "@/lib/clients/db";
import { getCustomerProfile } from "@/lib/clients/store";
import { listCustomerSales } from "@/lib/clients/sales";
import { PaymentCommitment } from "@/components/clients/PaymentCommitment";
export const dynamic="force-dynamic";
export default async function CommitmentPage({params}:{params:Promise<{id:string}>}){const {id}=await params;
 if(!await customerAdminSession())redirect("/admin/login");
 const owner=(await clientPool().query(`SELECT user_id FROM ${clientTable("oc_client_sales")} WHERE id=$1`,[id])).rows[0];if(!owner)notFound();
 const customer=await getCustomerProfile(owner.user_id);if(!customer)notFound();
 const sale=(await listCustomerSales(customer.id)).find(s=>s.id===id);if(!sale||!sale.credit)notFound();
 return <PaymentCommitment backHref={`/admin/clientes/${customer.id}`} customer={customer} sale={sale}/>;
}
