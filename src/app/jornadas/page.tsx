import Link from "next/link";
import { ArrowUpRight, Check, Eye, MapPin, Tags, UsersRound, CalendarDays } from "lucide-react";
import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { jornadasJsonLd } from "@/lib/structured-data";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { SectionReveal } from "@/components/site/SectionReveal";
import { LinkButton } from "@/components/site/LinkButton";
import JornadaQuickForm from "@/components/jornadas/JornadaQuickForm";
import site from "@/components/site/Site.module.css";
import views from "@/components/site/Views.module.css";
import styles from "./Jornadas.module.css";

export const metadata = pageMetadata(seoPages.jornadas);

const highlights = [
  { Icon: Eye, text: "Chequeo visual gratuito" },
  { Icon: MapPin, text: "Atención en tu empresa" },
  { Icon: Tags, text: "Hasta un 30% de descuento, según propuesta" },
] as const;
const steps = [
  { title: "Coordinamos la visita", description: "Nos cuentas dónde está tu empresa y cuántas personas podrían participar. Acordamos la fecha, el espacio y las condiciones." },
  { title: "Realizamos el chequeo", description: "Nuestro equipo visita tus instalaciones para realizar el chequeo visual de los trabajadores." },
  { title: "Asesoramos a cada persona", description: "Presentamos alternativas de lentes, cristales y accesorios, con sus precios y descuentos." },
] as const;
const included = ["Chequeo visual gratuito para los trabajadores", "Atención en las instalaciones de tu empresa", "Asesoría en alternativas ópticas"] as const;
const products = ["Lentes", "Cristales", "Accesorios"] as const;
const faqs = [
  { question: "¿Qué es gratuito y qué se paga?", answer: "El chequeo visual de los trabajadores es gratuito. Los lentes, cristales y accesorios se cotizan por separado, con descuentos de hasta un 30% según la propuesta." },
  { question: "¿Para qué empresas está pensada?", answer: "Para empresas con más de 20 trabajadores. Este requisito se refiere al tamaño de la empresa. Si tu equipo es más pequeño, puedes consultar por nuestros convenios ópticos para trabajadores y familiares." },
  { question: "¿Qué espacio necesita la empresa?", answer: "Revisamos contigo el espacio disponible y la organización de la atención antes de confirmar la jornada." },
  { question: "¿Cómo funciona el pago por planilla?", answer: "Es un financiamiento opcional mediante la empresa. Las condiciones se acuerdan por contrato antes de utilizarlo." },
  { question: "¿Completar el formulario reserva una fecha?", answer: "No. El formulario prepara un mensaje para WhatsApp. Cuando lo envíes, revisaremos contigo la disponibilidad antes de confirmar una fecha." },
] as const;

export default function JornadasPage() {
  return (
    <SiteShell active="Jornadas">
      <JsonLd data={jornadasJsonLd()} />
      <div className={styles.hero}>
        <PageHero
          audience="Para empresas con más de 20 trabajadores"
          title="Llevamos el cuidado visual a tu empresa"
          description="Una jornada óptica es una visita de nuestro equipo a tu empresa para revisar la visión de tus trabajadores y asesorarlos en la elección de lentes."
          image="/images/hero-consulta-oftalmologica.png"
          alt="Profesional realizando una evaluación visual"
          cta="Solicitar una jornada"
          href="#solicitar-jornada"
        >
          <ul className={styles.highlights}>
            {highlights.map(({ Icon, text }) => <li key={text}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /><span>{text}</span></li>)}
          </ul>
          <p className={styles.heroNote}>Los lentes, cristales y accesorios se cotizan por separado.</p>
        </PageHero>
      </div>
      <section className={`${site.container} ${views.section} ${styles.process}`} aria-labelledby="process-title">
        <SectionReveal>
          <h2 id="process-title" className={views.sectionIntro}>Así se realiza tu jornada</h2>
          <ProcessSteps steps={steps} />
        </SectionReveal>
      </section>
      <section className={`${site.container} ${views.section} ${styles.scope}`} aria-labelledby="scope-title">
        <SectionReveal>
          <h2 id="scope-title">Qué incluye la jornada</h2>
          <div className={styles.scopeGrid}>
            <div className={styles.included}>
              <span className={styles.eyebrow}>Durante la visita</span>
              <h3>Incluido</h3>
              <ul>{included.map((item) => <li key={item}><Check size={19} strokeWidth={1.6} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            </div>
            <div className={styles.products}>
              <span className={styles.eyebrow}>Productos ópticos</span>
              <h3>Se cotiza por separado</h3>
              <ul>{products.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>Descuentos de hasta un 30%, según la propuesta acordada.</p>
            </div>
          </div>
          <p className={styles.financing}><strong>Financiamiento opcional.</strong> Mediante la empresa, con descuento por planilla, previo acuerdo y contrato.</p>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${views.section} ${styles.faq}`} aria-labelledby="faq-title">
        <SectionReveal>
          <h2 id="faq-title">Resolvemos tus dudas</h2>
          <div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${views.formArea} ${styles.request}`} aria-label="Solicitud de jornada">
        <aside className={`${views.aside} ${styles.requestAside}`}>
          <SectionReveal>
            <h2>Organicemos una jornada en tu empresa</h2>
            <p className={styles.requestIntro}>Cuéntanos lo esencial y coordinemos los detalles por WhatsApp.</p>
            <ul className={styles.coordination}>
              <li><UsersRound size={21} aria-hidden="true" />Participantes estimados</li>
              <li><MapPin size={21} aria-hidden="true" />Ubicación de la empresa</li>
              <li><CalendarDays size={21} aria-hidden="true" />Fecha por acordar</li>
            </ul>
            <LinkButton href="#solicitar-jornada" arrow>Solicitar una jornada</LinkButton>
            <p className={views.asideFoot}>La fecha se acuerda por WhatsApp. Completar el formulario no genera un compromiso.</p>
          </SectionReveal>
        </aside>
        <div>
          <JornadaQuickForm />
          <p className={views.crossLink}>¿Buscas un beneficio continuo para trabajadores y familiares? <Link href="/convenios">Conoce nuestros convenios <ArrowUpRight size={16} aria-hidden="true" /></Link></p>
        </div>
      </section>
    </SiteShell>
  );
}
