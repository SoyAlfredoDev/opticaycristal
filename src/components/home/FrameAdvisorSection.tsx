import Image from "next/image";
import Link from "next/link";
import styles from "./FrameAdvisorSection.module.css";

const frames = [
  { file: "panto", name: "Panto", color: "carey" },
  { file: "redonda", name: "Redonda", color: "negro" },
  { file: "rectangular", name: "Rectangular", color: "gris" },
];

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
        <div className={styles.gallery}>
          {frames.map(({ file, name, color }) => (
            <figure key={file}>
              <Image
                src={`/asesor-monturas/portada/foto-real/${file}.webp`}
                alt={`Modelo con montura ${name.toLowerCase()} en ${color}`}
                width={1000}
                height={1000}
                unoptimized
              />
              <figcaption>{name} · {color}</figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.note}>Las monturas de ejemplo se simularon con IA.</p>
        <Link className={styles.button} href="/asesor-de-monturas/probar" prefetch={false}>
          Probar con mi foto
        </Link>
      </div>
    </section>
  );
}
