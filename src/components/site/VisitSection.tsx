import { ArrowUpRight } from "lucide-react";
import { brand, store, storeMapUrl, whatsappUrl } from "./content";
import { SectionReveal } from "./SectionReveal";
import site from "./Site.module.css";
import styles from "./VisitSection.module.css";

const visitMessage = "Hola, quisiera visitar el local en Huérfanos 713, local 18.";

type Props = {
  lead?: string;
  financing?: boolean;
};

export function VisitSection({
  lead = "Prueba las monturas en el local. Te asesoramos para elegir.",
  financing = false,
}: Props) {
  return (
    <section id="visita" aria-labelledby="visit-title" className={styles.band}>
      <div className={site.container}>
        <SectionReveal>
          {financing && (
            <div className={styles.faqs}>
              <div><p className={styles.kicker}>Crédito, sin dudas</p><h2 id="financing-faq-title">¿Tienes dudas?</h2></div>
              <div className={styles.questions} aria-labelledby="financing-faq-title">
                <details><summary>¿Qué documentos necesito?</summary><p>Revisamos tu cédula en la óptica. No pedimos liquidaciones de sueldo ni comprobantes de ingresos.</p></details>
                <details><summary>¿Debo pagar un pie?</summary><p>Sí. Siempre hay pie; el crédito depende de tu nivel y de la compra.</p></details>
                <details><summary>¿Puedo comprar por internet?</summary><p>Por ahora, la compra y la contratación son presenciales.</p></details>
              </div>
            </div>
          )}
          <div className={styles.layout}>
            <div className={styles.copy}>
              <p className={styles.kicker}>{financing ? "Te esperamos en la óptica." : "Visítanos"}</p>
              <h2 id="visit-title">{store.street}</h2>
              <address className={styles.address}>
                {financing && <>Galería Cohen<br /></>}<strong className={styles.unit}>{store.unit}</strong>{financing ? " · " : ", "}{store.locality}
              </address>
              {financing ? <p className={styles.hours}>Lunes a viernes: 10:00 a 18:00<br />Sábado: 10:00 a 15:00</p> : <p className={styles.lead}>{lead}</p>}
              <div className={styles.actions}>
                <a className={`${site.button} ${site.primary}`} href={storeMapUrl("directions")} target="_blank" rel="noopener noreferrer">
                  <span>Cómo llegar</span>
                  <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} />
                </a>
                <a className={`${site.button} ${site.outline} ${styles.whatsapp}`} href={whatsappUrl(financing ? "Hola, quiero conocer el crédito para mis lentes" : visitMessage)} target="_blank" rel="noopener noreferrer">
                  <span>{financing ? "Consultar por WhatsApp" : "Avisar por WhatsApp"}</span>
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
