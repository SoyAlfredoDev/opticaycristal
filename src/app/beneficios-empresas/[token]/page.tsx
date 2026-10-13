import { notFound } from "next/navigation";
import { deliveryByToken } from "@/lib/radar/crm-store";
import { SiteShell } from "@/components/site/SiteShell";
import { CONVENIO } from "@/lib/convenios";
import styles from "./Benefits.module.css";
export const runtime = "nodejs";
export const metadata = {
  title: "Beneficios ópticos para empresas | Óptica & Cristal",
  robots: { index: false, follow: false },
};
export default async function BenefitsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const d = await deliveryByToken(token);
  if (!d) notFound();
  const jornada = d.objective === "jornada";
  return (
    <SiteShell active={jornada ? "jornadas" : "convenios"}>
    <section className={styles.page}>
      <p className={styles.eyebrow}>
        ÓPTICA &amp; CRISTAL · EMPRESAS
      </p>
      <h1 className={styles.title}>{jornada ? "Coordinemos una jornada para tu equipo" : "Conversemos sobre beneficios ópticos para tu equipo"}</h1>
      <p className={styles.intro}>
        {jornada ? "Acercamos la atención visual a empresas con más de 20 trabajadores. Revisaremos participantes, ubicación y fechas para preparar una propuesta con servicios, costos y condiciones." : `Nuestro convenio ofrece ${CONVENIO.discountPercent}% de descuento online y en la óptica, y consulta visual gratuita para trabajadores y familiares. Las cuotas por nómina requieren un contrato con la empresa. También podemos evaluar una jornada en tus instalaciones según la dotación.`}
      </p>
      <section className={styles.card} aria-labelledby="conversation-title">
        <h2 id="conversation-title" className={styles.heading}>Solicita una conversación</h2>
        <p className={styles.description}>
          Cuéntanos qué necesitas. Nuestro equipo dará seguimiento a tu
          solicitud.
        </p>
        <form
          method="post"
          action="/api/radar/conversion"
          className={styles.form}
        >
          <input type="hidden" name="token" value={token} />
          <label className={styles.field}>
            <span>Tu nombre <span className={styles.required}>(obligatorio)</span></span>
            <input
              className={styles.control}
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Nombre y apellido"
              required
              maxLength={120}
            />
          </label>
          <label className={styles.field}>
            <span>Cargo <span className={styles.required}>(opcional)</span></span>
            <input
              className={styles.control}
              type="text"
              name="role"
              autoComplete="organization-title"
              placeholder="Ej.: Recursos Humanos"
              maxLength={120}
            />
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>¿Qué te gustaría coordinar? <span className={styles.required}>(obligatorio)</span></span>
            <textarea
              className={styles.control}
              name="message"
              placeholder="Cuéntanos si te interesa una jornada visual, un convenio o ambas opciones."
              required
              maxLength={2000}
              rows={4}
            />
          </label>
          <label hidden>
            Dejar vacío
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label className={`${styles.consent} ${styles.fullWidth}`}>
            <input type="checkbox" name="authorization" required aria-describedby="contact-privacy" />
            <span>Autorizo el contacto de Óptica &amp; Cristal para responder esta solicitud.</span>
          </label>
          <p id="contact-privacy" className={`${styles.privacy} ${styles.fullWidth}`}>
            Usaremos esta información para gestionar tu solicitud y asociarla a
            la campaña que te invitó.{" "}
            <a href="/privacidad">Política de privacidad</a>.
          </p>
          <button
            type="submit"
            className={`${styles.submit} ${styles.fullWidth}`}
          >
            {jornada ? "Solicitar información de una jornada" : "Solicitar una conversación"}
          </button>
        </form>
      </section>
    </section>
    </SiteShell>
  );
}
