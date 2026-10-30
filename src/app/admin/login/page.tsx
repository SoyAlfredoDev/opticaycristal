import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { requestedSupportTicket } from "@/lib/clients/support-types";
import { getSession } from "@/lib/auth";

export default async function AdminLoginPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
  const ticketId=requestedSupportTicket((await searchParams).ticket);
  if (await getSession()) redirect(ticketId?`/admin/clientes/soporte?ticket=${ticketId}`:"/admin");
  return <LoginForm supportTicketId={ticketId} />;
}
