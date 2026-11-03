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
  let tiers: CustomerProfile["tier"][] = [];
  try { tiers = await getCustomerTiers(); }
  catch { console.error("No se pudieron consultar los beneficios públicos del nivel Start."); }
  const start=tiers.find(level=>level.code==="start")??null;
  return (
    <SiteShell active="Crédito directo">
      <FinancingIntroduction tiers={tiers}/>
      <FinancingProcess start={start} />
      <VisitSection financing />
    </SiteShell>
  );
}
