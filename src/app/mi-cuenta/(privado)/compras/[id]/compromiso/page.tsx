import { notFound } from "next/navigation";
import { requireCustomerSession } from "@/lib/clients/current";
import { getCustomerSnapshot } from "@/lib/clients/store";
import { getCustomerDocumentSale } from "@/lib/clients/history";
import { PaymentCommitment } from "@/components/clients/PaymentCommitment";
import { getStoredCommitment } from "@/lib/clients/commitments";
import { CreditAgreement } from "@/components/clients/CreditAgreement";
import { DigitalAgreementSigning } from "@/components/clients/DigitalAgreementSigning";
import { digitalAgreementStatus } from "@/lib/clients/digital-agreement";
export const dynamic="force-dynamic";
export default async function CommitmentPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const session=await requireCustomerSession();
 const [snapshot,sale]=await Promise.all([getCustomerSnapshot(session.user.id),getCustomerDocumentSale(session.user.id,id)]);
 if(!snapshot||!sale?.credit)notFound();
 const document=await getStoredCommitment(id,session.user.id);
 if(document){
 const digital = document.model ? await digitalAgreementStatus(id,session.user.id) : null;
 const signing = digital && (digital.signed || (digital.available && !sale.signedAt && sale.status==="active"))
  ? <DigitalAgreementSigning saleId={id} signed={digital.signed} sent={digital.sent}/> : undefined;
 return <CreditAgreement signing={signing} digitalSigned={digital?.signed} pdfHref={`/api/clientes/compras/${id}/compromiso/pdf`} document={document} backHref="/mi-cuenta/compras" cancelled={sale.status==="cancelled"} signedAt={sale.signedAt}/>;
 }
 return <PaymentCommitment backHref="/mi-cuenta/compras" customer={snapshot.customer} sale={sale}/>;
}
