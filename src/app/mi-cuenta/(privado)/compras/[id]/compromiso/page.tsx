import { notFound } from "next/navigation";
import { currentCustomer } from "@/lib/clients/current";
import { listCustomerSales } from "@/lib/clients/sales";
import { PaymentCommitment } from "@/components/clients/PaymentCommitment";
export const dynamic="force-dynamic";
export default async function CommitmentPage({params}:{params:Promise<{id:string}>}){const {id}=await params;
 const customer=await currentCustomer();
 const sale=(await listCustomerSales(customer.id)).find(s=>s.id===id);if(!sale||!sale.credit)notFound();
 return <PaymentCommitment backHref={"/mi-cuenta/compras"} customer={customer} sale={sale}/>;
}
