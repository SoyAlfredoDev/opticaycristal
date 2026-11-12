import { StoreVideo } from "@/components/site/StoreVideo";
import theme from "@/components/site/PublicTheme.module.css";
import { editorialFont } from "@/components/home/editorial-font";
import { displayFont as display, bodyFont as body } from "@/components/site/fonts";
import { JsonLd } from "@/components/site/JsonLd";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { ServiceRibbon } from "@/components/home/ServiceRibbon";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { FrameAdvisorSection } from "@/components/home/FrameAdvisorSection";
import { PhotoGallery } from "@/components/home/PhotoGallery";
import { BusinessSection } from "@/components/home/BusinessSection";
import { HomeVisitSection } from "@/components/home/HomeVisitSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import styles from "@/components/site/Site.module.css";
import { pageMetadata, seoPages } from "@/lib/seo";
import { homeJsonLd } from "@/lib/structured-data";

export const metadata = pageMetadata(seoPages.home);

export default function Home() {
  return (
    <div data-public-site className={`${styles.home} ${display.variable} ${body.variable} ${editorialFont.variable} ${theme.scope}`}>
      <HomeHeader />
      <JsonLd data={homeJsonLd()} />
      <main id="contenido-principal">
        <HomeHero />
        <ServiceRibbon />
        <CollectionsSection />
        <FrameAdvisorSection />
        <PhotoGallery />
        <div className={styles.container}><StoreVideo /></div>
        <HomeVisitSection />
        <BusinessSection />
      </main>
      <HomeFooter />
    </div>
  );
}
