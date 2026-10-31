import theme from "@/components/site/PublicTheme.module.css";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, MapPin, MessageCircle, Truck } from "lucide-react";
import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { opticaJsonLd } from "@/lib/structured-data";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { displayFont, bodyFont } from "@/components/site/fonts";
import { editorialFont } from "@/components/home/editorial-font";
import { CatalogExperience } from "@/components/optica/CatalogExperience";
import { brand, storeMapUrl, whatsappUrl } from "@/components/site/content";
import { CONVENIO } from "@/lib/convenios";
import site from "@/components/site/Site.module.css";
import styles from "@/components/optica/CatalogEditorial.module.css";

export const metadata = pageMetadata(seoPages.optica);

export default function OpticaPage() {
  return <div data-public-site className={`${site.home} ${displayFont.variable} ${bodyFont.variable} ${editorialFont.variable} ${styles.page} ${theme.scope}`}>
    <SiteHeader active="Óptica" />
    <main id="contenido-principal" className={styles.scope}>
      <JsonLd data={opticaJsonLd()} />
      <CatalogExperience />
      <section className={styles.dispatch} aria-labelledby="dispatch-title">
        <div className={site.container}><Truck size={54} strokeWidth={1.2} aria-hidden="true" /><div>
          <h2 id="dispatch-title">Tus lentes, donde los necesites</h2>
          <p>Consulta cobertura, costo y plazo de despacho al comprar.</p>
          <p className={styles.smallPrint}>Con convenio de empresa, el {CONVENIO.discountPercent}% también aplica en compras online y en el local.</p>
        </div><a className={styles.primary} href={whatsappUrl("Hola, quisiera consultar cobertura, costo y plazo de despacho para mis lentes.")} target="_blank" rel="noopener noreferrer">Consultar despacho<ArrowRight size={19} aria-hidden="true" /></a></div>
      </section>
      <section className={styles.advisor} aria-labelledby="advisor-title">
        <Image src="/images/catalog/oc-round-v01.png" alt="Montura redonda dorada, imagen referencial" fill sizes="(min-width: 760px) 50vw, 100vw" />
        <div className={site.container}><h2 id="advisor-title">¿Necesitas ayuda para elegir?</h2><p>Te asesoramos para encontrar los lentes ideales para ti.</p>
          <a className={styles.primary} href={whatsappUrl("Hola, necesito asesoría para elegir mis lentes.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden="true" />Hablar con un asesor</a>
        </div>
      </section>
      <section id="visita" className={styles.visit} aria-labelledby="visit-title">
        <div className={`${site.container} ${styles.visitGrid}`}><div>
          <h2 id="visit-title">Visítanos en Huérfanos 713</h2>
          <address><MapPin size={20} aria-hidden="true" /><span>Galería Cohen · Local 18 · Santiago Centro</span></address>
          <p>Prueba las monturas y elige con nuestra asesoría.</p>
          <div className={styles.visitActions}>
            <a className={styles.primary} href={storeMapUrl("directions")} target="_blank" rel="noopener noreferrer">Cómo llegar<ArrowUpRight size={19} aria-hidden="true" /></a>
            <a className={styles.outline} href={whatsappUrl("Hola, quisiera visitar el local en Huérfanos 713, local 18.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden="true" />Avisar por WhatsApp</a>
          </div>
        </div><figure className={styles.map}>
          <iframe title={`Mapa de ${brand.name}, Huérfanos 713, local 18, Santiago Centro`} src={storeMapUrl("embed")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          <figcaption><a href={storeMapUrl("search")} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a></figcaption>
        </figure></div>
      </section>
    </main>
    <div className={`${styles.scope} ${styles.footer}`}><SiteFooter showContact={false} /></div>
  </div>;
}
