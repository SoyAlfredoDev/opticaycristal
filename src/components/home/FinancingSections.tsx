import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import { whatsappUrl } from "@/components/site/content";
import site from "@/components/site/Site.module.css";
import styles from "./FinancingSections.module.css";

const financingMessage = "Hola, quiero conocer el crédito para mis lentes";

export function FinancingIntroduction() {
  return (
    <section id="financiamiento" aria-labelledby="financing-title" className={styles.introduction}>
      <div className={`${site.container} ${styles.introGrid}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span aria-hidden="true" />Nuevo · Crédito directo</p>
          <h1 id="financing-title">Confiamos en<br />nuestros clientes.</h1>
          <p className={styles.description}>Tus próximos lentes, con crédito directo de tu óptica.</p>
          <p className={styles.benefit}><Check size={20} aria-hidden="true" />Sin liquidaciones de sueldo ni comprobantes de ingresos.</p>
          <div className={styles.actions}>
            <a className={`${site.button} ${site.primary}`} href="#como-financiar">
              Conocer el crédito<ArrowDown size={17} aria-hidden="true" />
            </a>
            <a className={`${site.button} ${site.text}`} href={whatsappUrl(financingMessage)} target="_blank" rel="noopener noreferrer">
              <span>Consultar por WhatsApp</span><ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.conditions}>Siempre con pie. Condiciones según tu nivel. Revisión presencial de cédula.</p>
          <p className={styles.location}>Compra presencial en Huérfanos 713 · Local 18</p>
        </div>
        <figure className={styles.visual}>
          <div className={styles.photo}>
            <Image src="/images/home/oc-lentes-opticos-v01.png" alt="Montura de lentes ópticos en tono vino con patillas doradas" loading="eager" fill sizes="(max-width: 899px) calc(100vw - 40px), (max-width: 1360px) 44vw, 600px" />
          </div>
          <figcaption>Imagen referencial de producto.</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function FinancingProcess() {
  return (
    <section id="como-financiar" tabIndex={-1} aria-labelledby="financing-process-title" className={styles.process}>
      <div className={site.container}>
        <div className={styles.processHeading}>
          <p className={styles.eyebrow}>Simple, cercano y presencial</p>
          <h2 id="financing-process-title">Así comienzas</h2>
        </div>
        <div className={styles.processGrid}>
          <ol className={styles.steps}>
            <li><span className={styles.number} aria-hidden="true">01</span><div><h3>Crea tu cuenta.</h3><p>Regístrate y verifica tu correo.</p></div></li>
            <li><span className={styles.number} aria-hidden="true">02</span><div><h3>Visita la óptica.</h3><p>Elige tus marcos y cristales con nuestra asesoría.</p></div></li>
            <li><span className={styles.number} aria-hidden="true">03</span><div><h3>Define tu compra.</h3><p>Conoce tu pie, monto del crédito y fecha de pago antes de confirmar.</p></div></li>
          </ol>
          <aside className={styles.start} aria-labelledby="start-title">
            <h3 id="start-title">Tu punto de partida: <span>Start</span></h3>
            <ul className={styles.limits}>
              <li><strong>30%</strong><span>Hasta el 30% de tu compra</span></li>
              <li><strong>$40.000</strong><span>Tope de crédito</span></li>
              <li><strong>1 cuota</strong><span>mensual</span></li>
            </ul>
            <p className={styles.startConditions}>Siempre con pie. El monto efectivo puede ser menor según la compra y tu cupo.</p>
            <p className={styles.scope}>Crédito para lentes, marcos y cristales. No incluye accesorios.</p>
            <Link className={`${site.button} ${site.primary}`} href="/mi-cuenta/registro">Crear mi cuenta<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
