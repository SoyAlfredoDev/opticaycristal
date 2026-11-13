import Image from "next/image";
import { FinancingExplanation } from "@/components/clients/FinancingExplanation";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Glasses, IdCard, MapPin, MessageCircle, UserRoundPlus } from "lucide-react";
import { whatsappUrl } from "@/components/site/content";
import { clp, type CustomerProfile } from "@/lib/clients/types";
import site from "@/components/site/Site.module.css";
import { editorialFont } from "./editorial-font";
import styles from "./FinancingSections.module.css";

const financingMessage = "Hola, quiero conocer el crédito para mis lentes";

export function FinancingIntroduction({ tiers=[] }: { tiers?: CustomerProfile["tier"][] }) {
  const maximumPercent=tiers.length?Math.max(...tiers.map(t=>t.maxPercent)):null;
  const maximumInstallments=tiers.length?Math.max(...tiers.map(t=>t.maxInstallments)):null;
  return (
    <section id="financiamiento" aria-labelledby="financing-title" className={`${styles.introduction} ${editorialFont.variable}`}>
      <div className={styles.scene}>
        <picture className={styles.backdrop}>
          <source media="(max-width: 759px)" srcSet="/images/home/credito-boutique-movil-v1.webp" />
          <Image src="/images/home/credito-boutique-v1.webp" alt="" fill priority sizes="100vw" />
        </picture>
      <div className={`${site.container} ${styles.introGrid}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span aria-hidden="true" />Crédito directo de tu óptica</p>
          <h1 id="financing-title">{maximumPercent?<>Financiamos hasta el <strong>{maximumPercent}%</strong><span>del precio de tus lentes.</span></>:<>Financia una parte<span>de tus lentes.</span></>}</h1>
          <p className={styles.description}>Tus próximos lentes, con crédito directo<br className={styles.desktopBreak} /> y sin tarjeta de crédito.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/credito-directo#simulador">Simular mi compra<ArrowRight size={20} aria-hidden="true" /></Link>
            <a className={styles.secondary} href={whatsappUrl(financingMessage)} target="_blank" rel="noopener noreferrer"><MessageCircle size={21} aria-hidden="true" />Consultar por WhatsApp</a>
          </div>
          <p className={styles.conditions}>Regístrate para conocer tu cupo disponible.<br />El porcentaje y el tope de crédito dependen de tu nivel. Pagas un pie y devuelves el crédito en cuotas. Compra presencial.</p>
        </div>
        <div className={styles.visual}>
          <p className={styles.signature}>Confiamos en<br />nuestros clientes.</p>
          <p className={styles.caption}>Imagen referencial de producto.</p>
        </div>
      </div>
      </div>
      <ul className={`${site.container} ${styles.benefits}`}>
        <li><CalendarDays aria-hidden="true" /><span>{maximumInstallments?<>Hasta {maximumInstallments} cuotas<br />según tu nivel</>:<>Cuotas mensuales<br />según tu nivel</>}</span></li>
        <li><FileText aria-hidden="true" /><span>Sin liquidaciones<br />de sueldo</span></li>
        <li><IdCard aria-hidden="true" /><span>Revisión presencial<br />de cédula</span></li>
      </ul>
    </section>
  );
}

const steps = [
  { title: "Crea tu cuenta.", text: "Regístrate y verifica tu correo.", Icon: UserRoundPlus },
  { title: "Visita la óptica.", text: "Elige tus marcos y cristales con nuestra asesoría.", Icon: Glasses },
  { title: "Define tu compra.", text: "Conoce tu pie, monto del crédito y fechas de pago. Firma tu compromiso de pago antes de confirmar.", Icon: FileText },
];

export function FinancingProcess({ start }: { start: CustomerProfile["tier"] | null }) {
  return (
    <section id="como-financiar" tabIndex={-1} aria-labelledby="financing-process-title" className={`${styles.process} ${editorialFont.variable}`}>
      <div className={site.container}>
        <div className={styles.processHeading}>
          <p className={styles.eyebrow}>Simple, cercano y presencial</p>
          <h2 id="financing-process-title">Así funciona tu crédito directo</h2>
          <p>Crea tu cuenta y conoce las condiciones antes de comprar.</p>
        </div>
        <div className={styles.processGrid}>
          <ol className={styles.steps}>
            {steps.map(({ title, text, Icon }, index) => <li key={title}>
              <span className={styles.number} aria-hidden="true">0{index + 1}</span>
              <span className={styles.stepIcon}><Icon aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>)}
          </ol>
          <aside className={styles.start} aria-labelledby="start-title">
            <h3 id="start-title">Tu punto de partida <span>Start</span></h3>
            <p className={styles.startLead}>Tu nivel al registrarte.</p>
            {start ? <ul className={styles.limits}>
              <li><strong>{start.maxPercent}%</strong><span>Hasta el {start.maxPercent}% del precio</span></li>
              <li><strong>{clp(start.maxAmount)}</strong><span>Tope del monto a crédito</span></li>
              <li><strong>{start.maxInstallments} {start.maxInstallments === 1 ? "cuota" : "cuotas"}</strong><span>{start.maxInstallments === 1 ? "mensual" : "mensuales"}</span></li>
            </ul> : <p className={styles.startConditions}>Consulta los beneficios vigentes de tu nivel al crear tu cuenta o en la óptica.</p>}
            <p className={styles.startConditions}>Siempre con pie. El monto efectivo puede ser menor según la compra y tu cupo.</p>
            <p className={styles.scope}>Crédito para lentes, marcos y cristales. No incluye accesorios.</p>
            <Link className={styles.primary} href="/mi-cuenta/registro">Crear mi cuenta<ArrowRight size={21} aria-hidden="true" /></Link>
          </aside>
        </div>
        {start&&<FinancingExplanation tier={start} publicStyle/>}
        <p className={styles.location}><MapPin size={20} aria-hidden="true" />Compra presencial · Huérfanos 713 · Galería Cohen · Local 18 · Santiago Centro</p>
      </div>
    </section>
  );
}
