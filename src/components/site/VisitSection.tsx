import { ArrowUpRight } from "lucide-react";
import { brand, store, storeMapUrl, whatsappUrl } from "./content";
import { SectionReveal } from "./SectionReveal";
import site from "./Site.module.css";
import styles from "./VisitSection.module.css";

const visitMessage = "Hola, quisiera visitar el local en Huérfanos 713, local 18.";

type Props = {
  lead?: string;
};

export function VisitSection({
  lead = "Prueba las monturas en el local. Te asesoramos para elegir.",
}: Props) {
  return (
    <section id="visita" aria-labelledby="visit-title" className={styles.band}>
      <div className={site.container}>
        <SectionReveal>
          <div className={styles.layout}>
            <div className={styles.copy}>
              <p className={styles.kicker}>Visítanos</p>
              <h2 id="visit-title">{store.street}</h2>
              <address className={styles.address}>{store.unit}, {store.locality}</address>
              <p className={styles.lead}>{lead}</p>
              <div className={styles.actions}>
                <a className={`${site.button} ${site.primary}`} href={storeMapUrl("directions")} target="_blank" rel="noopener noreferrer">
                  <span>Cómo llegar</span>
                  <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} />
                </a>
                <a className={`${site.button} ${site.outline} ${styles.whatsapp}`} href={whatsappUrl(visitMessage)} target="_blank" rel="noopener noreferrer">
                  <span>Avisar por WhatsApp</span>
                </a>
              </div>
            </div>
            <figure className={styles.map}>
              <div className={styles.canvas}>
                <iframe
                  title={`Mapa de ${brand.name}, ${store.fullAddress}`}
                  src={storeMapUrl("embed")}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <figcaption>
                <a href={storeMapUrl("search")} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
              </figcaption>
            </figure>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
