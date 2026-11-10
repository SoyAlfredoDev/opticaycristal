import { BRAND_SLOGAN, BRAND_SLOGAN_LINES } from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
import { Globe, Instagram, MapPin, MessageCircle } from "lucide-react";
import { brand, siteNavigation, store, storeMapUrl, whatsappUrl } from "./content";
import { FloatingWhatsapp } from "./FloatingWhatsapp";
import { LinkButton } from "./LinkButton";
import { SectionReveal } from "./SectionReveal";
import styles from "./Site.module.css";

export function SiteFooter({ showContact = true }: { showContact?: boolean }) {
  return (
    <>
      {showContact ? <section aria-labelledby="contact-title" className={`${styles.container} ${styles.contactSection}`}>
        <SectionReveal className={styles.contactInner}>
          <div className={styles.contactIcon}><MessageCircle size={34} strokeWidth={1.3} aria-hidden="true" /></div>
          <div><h2 id="contact-title">Te ayudamos a elegir tus lentes</h2><p>Escríbenos por WhatsApp</p></div>
          <LinkButton href={whatsappUrl("Hola, me gustaría recibir asesoría para elegir mis lentes.")}
            target="_blank" rel="noopener noreferrer" arrow>Hablemos de tu mirada</LinkButton>
        </SectionReveal>
      </section> : null}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <Link href="/" className={styles.footerLogo} aria-label={`${brand.name}, volver al inicio`}>
            <Image src={brand.logo} alt={brand.name} width={180} height={92} />
          </Link>
          <div className={styles.footerStatement}>
            <p>{BRAND_SLOGAN_LINES[0]}<br /><span>{BRAND_SLOGAN_LINES[1]}</span></p>
          </div>
          <nav aria-label="Navegación del pie de página">
            {siteNavigation.map((item) => <Link key={item.href} href={item.href}>{item.footerLabel}</Link>)}
          </nav>
          <address className={styles.footerContact}>
            <a href={storeMapUrl("search")} target="_blank" rel="noopener noreferrer"><MapPin size={18} aria-hidden="true" /><span>{store.street}, <strong className={styles.footerUnit}>{store.unit}</strong>, {store.locality}</span></a>
            <a href={brand.website}><Globe size={18} aria-hidden="true" />www.opticaycristal.cl</a>
            <a href={brand.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18} aria-hidden="true" />{brand.instagramLabel}</a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" />{brand.phone}</a>
          </address>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>Óptica &amp; Cristal · {BRAND_SLOGAN}</span>
          <div className={styles.footerUtilityLinks}>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/admin/login">Ingreso ejecutivos</Link>
          </div>
        </div>
      </footer>
      <FloatingWhatsapp />
    </>
  );
}
