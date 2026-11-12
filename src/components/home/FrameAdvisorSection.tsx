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
        <h2 id="frame-advisor-title">Tres formas de verte con lentes</h2>
        <p className={styles.intro}>
          Tenemos un asesor con IA que hemos preparado para asesorar a nuestros clientes en estilo y moda.
          Con una foto, puedes comparar tres monturas sugeridas según tu rostro y el estilo que más te guste.
        </p>
        <div className={styles.gallery}>
          {frames.map(({ file, name, color }) => (
            <figure key={file}>
              <Image
                src={`/asesor-monturas/portada/${file}.webp`}
                alt={`Modelo con montura ${name.toLowerCase()} en ${color}`}
                width={272}
                height={255}
                unoptimized
              />
              <figcaption>{name} · {color}</figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.note}>Simulaciones de ejemplo. Acceso en fase piloto.</p>
        <Link className={styles.button} href="/asesor-de-monturas/probar" prefetch={false}>
          Probar con mi foto
        </Link>
      </div>
    </section>
  );
}
