import { JsonLd } from "@/components/site/JsonLd";
import { pageMetadata, seoPages } from "@/lib/seo";
import { jornadasJsonLd } from "@/lib/structured-data";
import Link from "next/link";
import { ArrowUpRight, UsersRound, CalendarDays, MapPin, Eye, Tags, CreditCard } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { SectionReveal } from "@/components/site/SectionReveal";
import { CompanyRequestForm } from "@/components/forms/CompanyRequestForm";
import site from "@/components/site/Site.module.css";
import views from "@/components/site/Views.module.css";
import styles from "./Jornadas.module.css";
export const metadata = pageMetadata(seoPages.jornadas);
const benefits = [
  { Icon: Eye, title: "Chequeo visual gratuito", text: "Acercamos el cuidado de la salud visual a tus trabajadores, en una fecha coordinada con tu empresa." },
  { Icon: MapPin, title: "Vamos a tus instalaciones", text: "Nuestro equipo se desplaza a la empresa para realizar la atención. Revisamos contigo el espacio y la organización." },
  { Icon: Tags, title: "Descuentos de hasta un 30%", text: "En lentes, cristales y accesorios, según las condiciones de la propuesta. Recibirás los precios para evaluar las opciones." },
  { Icon: CreditCard, title: "Financiamiento opcional", text: "Mediante la empresa, con descuento por nómina, previo acuerdo y contrato." },
] as const;
const steps = [
  { title: "Nos cuentas lo que necesitas", description: "Déjanos tus datos, la ubicación y los participantes estimados. Te contactaremos para conocer tu equipo." },
  { title: "Recibes una propuesta clara", description: "Te explicamos los servicios, precios y condiciones. Acordamos la fecha y el espacio antes de confirmar la jornada." },
  { title: "Llevamos la atención a tu empresa", description: "Coordinamos la jornada con la persona responsable para que los trabajadores puedan atenderse en tus instalaciones." },
] as const;
const faqs = [
  { question: "¿Qué es una jornada visual?", answer: "Es una visita de nuestro equipo a tu empresa, en una fecha acordada, para realizar un chequeo visual a sus trabajadores y ofrecer alternativas de lentes, cristales y accesorios." },
  { question: "¿Qué incluye el beneficio gratuito?", answer: "El chequeo visual de los trabajadores es gratuito. Los lentes, cristales y accesorios se cotizan por separado, con descuentos de hasta un 30% según la propuesta. Compartimos los servicios, precios y condiciones antes de coordinar la actividad." },
  { question: "¿Para qué tamaño de empresa está pensada?", answer: "Las jornadas están pensadas para empresas con más de 20 trabajadores. Si tu equipo es más pequeño, podemos orientarte sobre un convenio óptico para trabajadores y familiares." },
  { question: "¿Es obligatorio financiar por nómina?", answer: "El financiamiento es opcional. Si tu empresa quiere incorporarlo, acordamos las condiciones por contrato antes de utilizarlo." },
  { question: "¿Enviar el formulario reserva una jornada?", answer: "El formulario solicita información. Te contactaremos para revisar participantes, ubicación, disponibilidad y condiciones antes de confirmar una fecha." },
] as const;
export default function JornadasPage() {
  return (
    <SiteShell active="Jornadas">
      <JsonLd data={jornadasJsonLd()} />
      <PageHero audience="Para empresas con más de 20 trabajadores" title={<>Una jornada visual<br />en tu empresa</>} description="Llevamos nuestro equipo a tus instalaciones para ofrecer un chequeo visual gratuito a tus trabajadores y descuentos de hasta un 30%, según propuesta. Cuéntanos sobre tu equipo y te compartiremos precios y condiciones." image="/images/hero-consulta-oftalmologica.png" alt="Profesional realizando una evaluación visual" cta="Quiero precios y condiciones" href="#solicitar-jornada" />
      <section className={`${site.container} ${views.section}`} aria-labelledby="benefits-title">
        <SectionReveal>
          <h2 id="benefits-title">Cuida la mirada de tu equipo,<br />sin salir de la empresa.</h2>
          <p className={styles.intro}>Una jornada reúne la atención visual y la asesoría en un lugar cercano a tus trabajadores. Tú coordinas con nosotros; nuestro equipo realiza la visita.</p>
          <ul className={styles.benefits}>{benefits.map(({ Icon, title, text }) => <li key={title}><Icon size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></li>)}</ul>
        </SectionReveal>
      </section>
      <section className={`${site.container} ${views.section}`} aria-labelledby="process-title">
        <SectionReveal><h2 id="process-title" className={views.sectionIntro}>Así organizamos tu jornada</h2><ProcessSteps steps={steps} /></SectionReveal>
      </section>
      <section className={`${site.container} ${views.section} ${styles.faq}`} aria-labelledby="faq-title">
        <SectionReveal><h2 id="faq-title">Lo que necesitas saber</h2><div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></SectionReveal>
      </section>
      <section className={`${site.container} ${views.formArea}`} aria-label="Solicitud de jornada">
        <aside className={views.aside}>
          <SectionReveal>
            <h2>Conversemos sobre tu próxima jornada</h2>
            <div className={views.benefit}><UsersRound strokeWidth={1.3} aria-hidden="true" /><div><h3>Una propuesta para tu equipo</h3><p>Cuéntanos cuántas personas podrían participar y qué necesita tu empresa.</p></div></div>
            <div className={views.benefit}><CalendarDays strokeWidth={1.3} aria-hidden="true" /><div><h3>Fecha por acordar</h3><p>El mes estimado nos ayuda a revisar disponibilidad. La fecha se confirma contigo.</p></div></div>
            <div className={views.benefit}><MapPin strokeWidth={1.3} aria-hidden="true" /><div><h3>Servicios y condiciones claros</h3><p>Te compartiremos la información antes de organizar la atención en tus instalaciones.</p></div></div>
            <p className={views.asideFoot}>Pedir información no firma un contrato ni reserva una jornada.</p>
          </SectionReveal>
        </aside>
        <div><CompanyRequestForm kind="jornada" /><p className={views.crossLink}>¿Buscas un beneficio continuo para trabajadores y familiares? <Link href="/convenios">Conoce nuestros convenios <ArrowUpRight size={16} aria-hidden="true" /></Link></p></div>
      </section>
    </SiteShell>
  );
}
