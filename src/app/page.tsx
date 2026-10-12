import { displayFont as display, bodyFont as body } from "@/components/site/fonts";
import { JsonLd } from "@/components/site/JsonLd";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { ServiceRibbon } from "@/components/home/ServiceRibbon";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { PhotoGallery } from "@/components/home/PhotoGallery";
import { BusinessSection } from "@/components/home/BusinessSection";
import { VisitSection } from "@/components/site/VisitSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import styles from "@/components/site/Site.module.css";
import { pageMetadata, seoPages } from "@/lib/seo";
import { homeJsonLd } from "@/lib/structured-data";

export const metadata = pageMetadata(seoPages.home);

export default function Home() {
  return (
    <div className={`${styles.home} ${display.variable} ${body.variable}`}>
      <HomeHeader />
      <JsonLd data={homeJsonLd()} />
      <main id="contenido-principal">
        <HomeHero />
        <ServiceRibbon />
        <CollectionsSection />
        <PhotoGallery />
        <VisitSection />
        <BusinessSection />
      </main>
      <HomeFooter />
    </div>
  );
}
