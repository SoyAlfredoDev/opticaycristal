import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { jornadasJsonLd } from "@/lib/structured-data";
import Link from "next/link";
import { ArrowUpRight, UsersRound, CalendarDays, MapPin } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { SectionReveal } from "@/components/site/SectionReveal";
import { CompanyRequestForm } from "@/components/forms/CompanyRequestForm";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
export const metadata = pageMetadata(seoPages.jornadas);
const steps = [
  { title: "Cuéntanos sobre tu empresa", description: "Conocemos tus necesidades para ofrecerte la mejor solución." },
  { title: "Definimos fecha y condiciones", description: "Coordinamos todos los detalles de la jornada en conjunto." },
  { title: "Realizamos la jornada", description: "Llevamos la atención visual a tus instalaciones." },
] as const;
export default function JornadasPage() {
  return <SiteShell active="Jornadas"><JsonLd data={jornadasJsonLd()} /><PageHero title={<>Jornadas<br />oftalmológicas</>} description="Coordinamos la atención visual en tu empresa y acercamos la jornada a tu equipo." image="/images/hero-consulta-oftalmologica.png" alt="Evaluación visual durante una jornada oftalmológica" cta="Coordinar una jornada" href="#solicitar-jornada" />
    <section className={`${site.container} ${styles.section}`} aria-labelledby="process-title"><SectionReveal><h2 id="process-title" className={styles.sectionIntro}>Una jornada, bien coordinada</h2><ProcessSteps steps={steps} /></SectionReveal></section>
    <section className={`${site.container} ${styles.formArea}`} aria-label="Solicitud de jornada">
      <aside className={styles.aside}><SectionReveal><h2>Acercamos la atención a tu equipo</h2>
        <div className={styles.benefit}><UsersRound strokeWidth={1.3} aria-hidden="true" /><div><h3>Coordinación con tu empresa</h3><p>Trabajamos contigo para adaptar la jornada a tus necesidades.</p></div></div>
        <div className={styles.benefit}><CalendarDays strokeWidth={1.3} aria-hidden="true" /><div><h3>Fecha y lugar por acordar</h3><p>Definimos en conjunto el momento y el espacio para la atención.</p></div></div>
        <div className={styles.benefit}><MapPin strokeWidth={1.3} aria-hidden="true" /><div><h3>Atención en tus instalaciones</h3><p>Coordinamos los requisitos para realizar la jornada en tu empresa.</p></div></div>
        <p className={styles.asideFoot}>Te contactaremos para revisar disponibilidad y condiciones.</p>
      </SectionReveal></aside>
      <div><CompanyRequestForm kind="jornada" /><p className={styles.crossLink}>¿Buscas beneficios permanentes? <Link href="/convenios">Conoce nuestros convenios <ArrowUpRight size={16} aria-hidden="true" /></Link></p></div>
    </section>
  </SiteShell>;
}
