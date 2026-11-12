import { redirect } from "next/navigation";
import { FrameAdvisor } from "@/components/clients/FrameAdvisor";
import { requireCustomerSession } from "@/lib/clients/current";
import { canUseFrameAdvisor } from "@/lib/frame-advisor/access";

export default async function FrameAdvisorPage() {
  const session = await requireCustomerSession();
  if (!await canUseFrameAdvisor(session.user.id)) redirect("/mi-cuenta");
  return <FrameAdvisor />;
}
