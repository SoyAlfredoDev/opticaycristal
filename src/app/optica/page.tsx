import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { opticaJsonLd } from "@/lib/structured-data";
import Image from "next/image";
import { Truck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { SectionReveal } from "@/components/site/SectionReveal";
import { LinkButton } from "@/components/site/LinkButton";
import { CartExperience } from "@/components/optica/CartExperience";
import { whatsappUrl } from "@/components/site/content";
import { CONVENIO } from "@/lib/convenios";
import { VisitSection } from "@/components/site/VisitSection";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
export const metadata = pageMetadata(seoPages.optica);
export default function OpticaPage() {
  return <SiteShell active="Óptica"><JsonLd data={opticaJsonLd()} /><PageHero title="Vistas de la óptica" description={`Lentes ópticos, lentes de sol y accesorios en Santiago Centro. Con convenio de empresa, el ${CONVENIO.discountPercent}% también aplica en la compra online.`} image="/images/catalog/oc-cat-eye-v01.png" alt="Lentes vinotinto con detalles dorados, imagen referencial" compact />
    <p className={styles.promoRibbon}>Por pocos días: tus lentes con un <strong>20% de Descuento</strong></p>
    <section className={site.container} aria-label="Catálogo de lentes y accesorios"><CartExperience /></section>
    <div className={site.container}><SectionReveal><section className={styles.dispatch} aria-labelledby="dispatch-title"><Truck size={54} strokeWidth={1.2} aria-hidden="true" /><div><h2 id="dispatch-title">Tus lentes, donde los necesites</h2><p>Solicita despacho a domicilio. Consulta cobertura, costo y plazo al comprar. Con convenio de empresa, el {CONVENIO.discountPercent}% de descuento aplica en esta compra online y en el local.</p></div><LinkButton href={whatsappUrl("Hola, quisiera consultar cobertura, costo y plazo de despacho para mis lentes.")} target="_blank" rel="noopener noreferrer" arrow>Consultar despacho</LinkButton></section></SectionReveal>
      <SectionReveal><section className={styles.advisor} aria-labelledby="advisor-title"><div className={styles.advisorImage}><Image src="/images/hero-professional-woman2.png" alt="Mujer con lentes ópticos en un espacio luminoso" fill sizes="(min-width: 900px) 28vw, 90vw" /></div><div className={styles.advisorCopy}><h2 id="advisor-title">¿Necesitas ayuda para elegir?</h2><p>Te asesoramos para encontrar los lentes ideales para ti.</p><LinkButton href={whatsappUrl("Hola, necesito asesoría para elegir mis lentes.")} target="_blank" rel="noopener noreferrer" arrow>Hablar con un asesor</LinkButton></div></section></SectionReveal>
    </div>
    <VisitSection lead="Si prefieres verlos en persona, prueba las monturas en el local." />
  </SiteShell>;
}
