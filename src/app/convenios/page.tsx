import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { conveniosJsonLd } from "@/lib/structured-data";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, UsersRound, ShoppingBag, Eye, Check, Info } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { SectionReveal } from "@/components/site/SectionReveal";
import { CompanyRequestForm } from "@/components/forms/CompanyRequestForm";
import { LinkButton } from "@/components/site/LinkButton";
import { CONVENIO, convenioFaqs, convenioSteps } from "@/lib/convenios";
import site from "@/components/site/Site.module.css";
import views from "@/components/site/Views.module.css";
import styles from "./Convenios.module.css";

export const metadata = pageMetadata(seoPages.convenios);

const benefits = [
  { Icon: ShoppingBag, lead: `${CONVENIO.discountPercent}%`, title: "de descuento", text: "Aplica en la compra online y en la óptica." },
  { Icon: UsersRound, title: "Familiares incluidos", text: "El beneficio cubre a tus trabajadores y también a los familiares de cada uno." },
  { Icon: Eye, title: "Consulta visual gratuita", text: "Coordinamos la atención de tus trabajadores y sus familiares en nuestra óptica." },
] as const;

const paymentFlow = [
  { actor: "Trabajador", title: "Compra en hasta 3 cuotas", text: "Elige esa forma de pago al comprar sus lentes." },
  { actor: "Tu empresa", title: "Paga a Óptica & Cristal", text: "El cobro llega a la empresa, según el contrato." },
  { actor: "La nómina", title: "Descuenta esas cuotas", text: "El trabajador las paga desde su sueldo." },
] as const;

export default function ConveniosPage() {
  return (
    <SiteShell active="Convenios">
      <JsonLd data={conveniosJsonLd()} />
      <PageHero
        audience="Empresas con 5 o más trabajadores"
        title={<>Un beneficio óptico<br />para tu equipo</>}
        description={`Un convenio es un beneficio que tu empresa ofrece a sus trabajadores y familiares: ${CONVENIO.discountPercent}% de descuento online y en nuestra óptica, y consulta visual gratuita. Te ayudamos a incorporarlo a tu equipo.`}
        image="/images/hero-equipo-trabajo.png"
        alt="Trabajadores de una empresa reunidos en una oficina luminosa"
        cta="Quiero información del convenio"
        href="#solicitar-convenio"
      />
      <section className={`${site.container} ${styles.benefitsSection}`} aria-labelledby="benefits-title">
        <SectionReveal className={styles.benefitsLayout}>
          <div className={styles.intro}>
            <h2 id="benefits-title">Para trabajadores<br /><em>y sus familiares.</em></h2>
            <p>Tu empresa se registra con nosotros y su equipo utiliza el beneficio al comprar online o visitar nuestra óptica. Incluye {CONVENIO.discountPercent}% de descuento y consulta visual gratuita, también para sus familiares.</p>
          </div>
          <ul className={styles.benefitList}>
            {benefits.map(({ Icon, title, text, ...item }) => (
              <li key={title}><Icon size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3 className={"lead" in item ? styles.discountTitle : undefined}>{"lead" in item ? <span className={styles.percent}>{item.lead}</span> : null}{"lead" in item ? " " : null}{title}</h3><p>{text}</p></div></li>
            ))}
          </ul>
        </SectionReveal>
      </section>
      <section className={styles.financing} aria-labelledby="financing-title">
        <SectionReveal className={site.container}>
          <div className={styles.financingHeading}>
            <p className={styles.eyebrow}>Financiamiento opcional · previo acuerdo y contrato</p>
            <h2 id="financing-title">Hasta {CONVENIO.maxInstallments} cuotas <em>por nómina</em></h2>
            <p>Si tu empresa quiere sumar esta opción, acordamos las condiciones por contrato: la empresa paga a Óptica & Cristal y descuenta las cuotas del sueldo del trabajador.</p>
          </div>
          <ol className={styles.paymentFlow}>
            {paymentFlow.map(({ actor, title, text }, index) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
                <p className={styles.actor}>{actor}</p>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className={styles.financingFoot}>
            <p className={styles.financingNote}><Info size={18} aria-hidden="true" />Puedes solicitar el descuento y la consulta visual sin incluir financiamiento. Primero coordinamos el registro; las cuotas requieren acuerdo y contrato.</p>
            <LinkButton href="#solicitar-convenio" arrow>Consultar las condiciones</LinkButton>
          </div>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${styles.comparison}`} aria-labelledby="options-title">
        <SectionReveal className={styles.comparisonReveal}>
          <h2 id="options-title">Dos formas de ofrecer el beneficio</h2>
          <div className={styles.optionStage}>
            <div className={styles.options}>
              <figure>
                <Image src="/images/hero-equipo-trabajo.png" alt="" fill sizes="(min-width: 900px) 42vw, 100vw" className={styles.optionPhoto} />
                <figcaption>
                  <p className={styles.optionKicker}>Registro</p>
                  <h3>Al registrar tu empresa</h3>
                  <ul>
                    <li><Check aria-hidden="true" />20% para trabajadores y familiares</li>
                    <li><Check aria-hidden="true" />Compras online y presenciales</li>
                    <li><Check aria-hidden="true" />Consulta visual gratuita</li>
                  </ul>
                  <p>Para empresas con 5 o más trabajadores.</p>
                </figcaption>
              </figure>
              <figure className={styles.payroll}>
                <Image src="/images/audience-workers.png" alt="" fill sizes="(min-width: 900px) 42vw, 100vw" className={styles.optionPhoto} />
                <figcaption>
                  <p className={styles.optionKicker}>Nómina</p>
                  <h3>Si sumas cuotas por nómina</h3>
                  <p>Incluye todo el registro, y además:</p>
                  <ul>
                    <li><Check aria-hidden="true" />Hasta tres cuotas para el trabajador</li>
                    <li><Check aria-hidden="true" />Tu empresa paga a Óptica & Cristal</li>
                    <li><Check aria-hidden="true" />Las cuotas se descuentan de la nómina</li>
                  </ul>
                  <p>Requiere un contrato entre tu empresa y Óptica & Cristal.</p>
                </figcaption>
              </figure>
            </div>
          </div>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${styles.faq}`} aria-labelledby="faq-title">
        <SectionReveal>
          <h2 id="faq-title">Preguntas para tu empresa</h2>
          <div className={styles.faqList}>
            {convenioFaqs.map(({ question, answer }) => (
              <details key={question}><summary>{question}</summary><p>{answer}</p></details>
            ))}
          </div>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${views.formArea}`} aria-label="Registro de empresa y solicitud de convenio">
        <aside className={`${views.aside} ${views.plainAside}`}>
          <SectionReveal>
            <h2>Conversemos sobre tu equipo.</h2>
            <p>Déjanos tus datos y te explicaremos los beneficios, el registro y las condiciones. Solicitar información no firma un contrato.</p>
            <ProcessSteps steps={convenioSteps} vertical />
            <div className={views.crossLink}>
              <p>¿También quieres una jornada en tu empresa?</p>
              <Link href="/jornadas">Conoce nuestras jornadas <ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </SectionReveal>
        </aside>
        <CompanyRequestForm kind="convenio" />
      </section>
    </SiteShell>
  );
}
