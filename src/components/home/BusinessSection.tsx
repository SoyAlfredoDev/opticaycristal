import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "./LinkButton";
import { SectionReveal } from "./SectionReveal";
import { JornadaCta } from "./JornadaCta";
import { CONVENIO } from "@/lib/convenios";
import styles from "@/components/site/Site.module.css";

export function BusinessSection() {
  return (
    <section aria-labelledby="business-title" className={`${styles.container} ${styles.businessSection}`}>
      <SectionReveal>
        <div className={styles.sectionHeading}>
          <h2 id="business-title">También cuidamos a tu equipo</h2>
          <span className={styles.sectionCaption}>Salud visual, mayor bienestar</span>
        </div>
        <div className={styles.businessGrid}>
          <article id="convenios" className={styles.businessPanel}>
            <div className={styles.businessCopy}>
              <h3><Link href="/convenios">Convenio<br />con empresas</Link></h3>
              <p>{CONVENIO.discountPercent}% en la compra online y en la óptica para trabajadores y familiares, y consulta visual gratuita. Hasta tres cuotas por nómina con contrato de empresa.</p>
              <span className={styles.requirement}>Para empresas con más de 10 trabajadores.</span>
              <LinkButton href="/convenios" variant="text" arrow>Conocer convenios</LinkButton>
            </div>
            <div className={styles.businessImage}>
              <Image src="/images/hero-equipo-trabajo.png" alt="Equipo de trabajo en una oficina luminosa"
                fill sizes="(min-width: 900px) 26vw, (min-width: 600px) 43vw, 88vw" />
            </div>
          </article>
          <article id="jornadas" className={styles.businessPanel}>
            <span id="contratar" className={styles.legacyAnchor} aria-hidden="true" />
            <div className={styles.businessCopy}>
              <h3><Link href="/jornadas">Jornadas<br />oftalmológicas</Link></h3>
              <p>Coordinamos la atención visual en tu empresa, cerca de tu equipo.</p>
              <JornadaCta />
            </div>
            <div className={styles.businessImage}>
              <Image src="/images/hero-consulta-oftalmologica.png" alt="Atención visual con un equipo de evaluación óptica"
                fill sizes="(min-width: 900px) 26vw, (min-width: 600px) 43vw, 88vw" />
            </div>
          </article>
        </div>
      </SectionReveal>
    </section>
  );
}
