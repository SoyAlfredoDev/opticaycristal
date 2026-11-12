import { requireCustomerSession } from "@/lib/clients/current";
import { CustomerShell } from "@/components/clients/CustomerShell";
import { CustomerDataProvider } from "@/components/clients/CustomerDataProvider";
import { canUseFrameAdvisor } from "@/lib/frame-advisor/access";
export const dynamic = "force-dynamic";
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomerSession();
  const viewer = { firstName: session.user.firstName, lastName: session.user.lastName, frameAdvisor: await canUseFrameAdvisor(session.user.id) };
  return <CustomerDataProvider key={session.user.id} ownerId={session.user.id} viewer={viewer}>
    <CustomerShell customer={viewer}>{children}</CustomerShell>
  </CustomerDataProvider>;
}
