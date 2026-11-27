import { FrameAdvisorExamples } from "./FrameAdvisorExamples";
import styles from "./FrameAdvisorSection.module.css";

export function FrameAdvisorSection() {
  return (
    <section id="asesor-de-monturas" className={styles.section} aria-labelledby="frame-advisor-title">
      <div className={styles.content}>
        <h2 id="frame-advisor-title">¿Qué lentes te quedan mejor?</h2>
        <p className={styles.intro}>
          Tómate una foto o sube una que ya tengas. Nuestro nuevo Asesor Inteligente te sugerirá
          tres monturas según tu rostro y tu estilo para que veas cómo te quedan.
        </p>
        <p className={styles.photoLabel}>Fotos reales</p>
        <FrameAdvisorExamples />
      </div>
    </section>
  );
}
