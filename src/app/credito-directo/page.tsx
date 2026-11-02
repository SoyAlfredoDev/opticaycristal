import { FinancingIntroduction, FinancingProcess } from "@/components/home/FinancingSections";
import { SiteShell } from "@/components/site/SiteShell";
import { VisitSection } from "@/components/site/VisitSection";
import { pageMetadata, seoPages } from "@/lib/seo";
import { connection } from "next/server";
import { getCustomerTiers } from "@/lib/clients/store";
import type { CustomerProfile } from "@/lib/clients/types";

export const metadata = pageMetadata(seoPages.creditoDirecto);

export default async function DirectCreditPage() {
  await connection();
  let start: CustomerProfile["tier"] | null = null;
  try { start = (await getCustomerTiers()).find(level => level.code === "start") ?? null; }
  catch { console.error("No se pudieron consultar los beneficios públicos del nivel Start."); }
  return (
    <SiteShell active="Crédito directo">
      <FinancingIntroduction />
      <FinancingProcess start={start} />
      <VisitSection financing />
    </SiteShell>
  );
}
