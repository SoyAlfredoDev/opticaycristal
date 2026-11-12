import { redirect } from "next/navigation";
import { AuthForm } from "@/components/clients/AuthForm";
import { customerSession } from "@/lib/clients/auth";
import { requestedSupportTicket } from "@/lib/clients/support-types";
export default async function CustomerLogin({searchParams}:{searchParams:Promise<{ticket?:string; destino?:string}>}) {
 const {ticket, destino} = await searchParams;
 const ticketId=requestedSupportTicket(ticket);
 const openAdvisor = destino === "asesor";
 if (openAdvisor && await customerSession()) redirect("/mi-cuenta/asesor-de-monturas");
 if(ticketId&&await customerSession())redirect(`/mi-cuenta/soporte?ticket=${ticketId}`);
 return <AuthForm mode="login" supportTicketId={ticketId} openAdvisor={openAdvisor} />;
}
