import { FinancingIntroduction, FinancingProcess } from "@/components/home/FinancingSections";
import { SiteShell } from "@/components/site/SiteShell";
import { VisitSection } from "@/components/site/VisitSection";
import { pageMetadata, seoPages } from "@/lib/seo";

export const metadata = pageMetadata(seoPages.creditoDirecto);

export default function DirectCreditPage() {
  return (
    <SiteShell active="Crédito directo">
      <FinancingIntroduction />
      <FinancingProcess />
      <VisitSection financing />
    </SiteShell>
  );
}
