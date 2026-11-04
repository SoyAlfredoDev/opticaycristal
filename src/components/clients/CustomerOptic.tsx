import Image from "next/image";
import { ArrowUpRight, Camera, Clock3, Instagram, Mail, MapPin, MessageCircle, Navigation } from "lucide-react";
import { brand, storeHours, store, storeMapUrl, storePhotos, whatsappUrl } from "@/components/site/content";
import { CONTACTO_EMAIL } from "@/lib/solicitudes/types";
import ui from "./ClientSpace.module.css";
import styles from "./CustomerOptic.module.css";
export function CustomerOptic() {
 return <>
  <h1>La óptica</h1><p className={ui.muted}>Conócenos y planifica tu visita.</p>
  <section className={`${ui.panel} ${styles.location}`} aria-labelledby="optic-location">
   <div className={styles.address}>
    <span className={styles.icon}><MapPin size={23} aria-hidden="true"/></span>
    <p className={styles.kicker}>ÓPTICA &amp; CRISTAL</p><h2 id="optic-location">{store.street}</h2>
    <address><strong className={styles.unit}>{store.unit}</strong> · {store.locality}<br/><span>Galería Cohen</span></address>
    <div className={styles.hours}><h3><Clock3 size={17} aria-hidden="true"/>Horario de atención</h3><dl><div><dt>Lunes a viernes</dt><dd>{storeHours[0].opens} a {storeHours[0].closes}</dd></div><div><dt>Sábado</dt><dd>{storeHours[1].opens} a {storeHours[1].closes}</dd></div></dl></div>
    <div className={styles.actions}><a href={storeMapUrl("directions")} target="_blank" rel="noopener noreferrer" className={`${ui.button} ${ui.primary}`}><Navigation size={17} aria-hidden="true"/>Cómo llegar</a><a href={whatsappUrl("Hola, quiero visitar la óptica en Huérfanos 713, local 18.")} target="_blank" rel="noopener noreferrer" className={ui.button}>Consultar por WhatsApp</a></div>
   </div>
   <figure className={styles.map}><iframe title={`Mapa de ${brand.name}, ${store.fullAddress}`} src={storeMapUrl("embed",15)} loading="lazy" referrerPolicy="no-referrer" allowFullScreen/><figcaption><a href={storeMapUrl("search")} target="_blank" rel="noopener noreferrer">Abrir en Google Maps<ArrowUpRight size={15} aria-hidden="true"/></a></figcaption></figure>
  </section>
  <section className={styles.contactSection} aria-labelledby="optic-contact"><h2 id="optic-contact">Síguenos y conversemos</h2><div className={styles.contacts}>
   <a className={`${ui.panel} ${styles.contact}`} href={brand.instagram} target="_blank" rel="noopener noreferrer"><span className={styles.contactIcon}><Instagram size={22} aria-hidden="true"/></span><span><strong>Instagram</strong><span>{brand.instagramLabel}</span></span><ArrowUpRight size={18} aria-hidden="true"/></a>
   <a className={`${ui.panel} ${styles.contact}`} href={whatsappUrl("Hola, quisiera conocer más sobre la óptica.")} target="_blank" rel="noopener noreferrer"><span className={styles.contactIcon}><MessageCircle size={22} aria-hidden="true"/></span><span><strong>WhatsApp</strong><span>{brand.phone}</span></span><ArrowUpRight size={18} aria-hidden="true"/></a>
   <a className={`${ui.panel} ${styles.contact}`} href={`mailto:${CONTACTO_EMAIL}`}><span className={styles.contactIcon}><Mail size={22} aria-hidden="true"/></span><span><strong>Correo electrónico</strong><span>{CONTACTO_EMAIL}</span></span><ArrowUpRight size={18} aria-hidden="true"/></a>
  </div></section>
  <section className={styles.photosSection} aria-labelledby="optic-photos"><div className={styles.photosHeading}><h2 id="optic-photos">Fotos y novedades</h2>{storePhotos.length>0&&<a href={brand.instagram} target="_blank" rel="noopener noreferrer" className={ui.textLink}>Ver Instagram<ArrowUpRight size={15} aria-hidden="true"/></a>}</div>
   {storePhotos.length>0?<div className={styles.photos}>{storePhotos.map(photo=><figure key={photo.src}><a href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar foto: ${photo.alt}`}><Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1100px) 30vw, (min-width: 650px) 45vw, 95vw"/></a><figcaption>{photo.alt}</figcaption></figure>)}</div>:<div className={`${ui.panel} ${styles.photoInvitation}`}><span className={styles.icon}><Camera size={26} aria-hidden="true"/></span><div><h3>Conoce nuestro día a día</h3><p>Descubre las fotos y novedades de la óptica en Instagram.</p></div><a href={brand.instagram} target="_blank" rel="noopener noreferrer" className={ui.button}>Explorar fotos<ArrowUpRight size={16} aria-hidden="true"/></a></div>}
  </section>
 </>;
}
