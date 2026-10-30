import { redirect } from "next/navigation";
import { AuthForm } from "@/components/clients/AuthForm";
import { customerSession } from "@/lib/clients/auth";
import { requestedSupportTicket } from "@/lib/clients/support-types";
export default async function CustomerLogin({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
 const ticketId=requestedSupportTicket((await searchParams).ticket);
 if(ticketId&&await customerSession())redirect(`/mi-cuenta/soporte?ticket=${ticketId}`);
 return <AuthForm mode="login" supportTicketId={ticketId} />;
}
