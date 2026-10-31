import { notFound } from "next/navigation";
import { requireCustomerSession } from "@/lib/clients/current";
import { getCustomerSnapshot } from "@/lib/clients/store";
import { getCustomerDocumentSale } from "@/lib/clients/history";
import { PaymentCommitment } from "@/components/clients/PaymentCommitment";
export const dynamic="force-dynamic";
export default async function CommitmentPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const session=await requireCustomerSession();
 const [snapshot,sale]=await Promise.all([getCustomerSnapshot(session.user.id),getCustomerDocumentSale(session.user.id,id)]);
 if(!snapshot||!sale?.credit)notFound();
 return <PaymentCommitment backHref="/mi-cuenta/compras" customer={snapshot.customer} sale={sale}/>;
}
