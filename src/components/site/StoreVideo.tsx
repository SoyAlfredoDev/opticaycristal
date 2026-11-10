import { storeVideo } from "./content";
import styles from "./StoreVideo.module.css";

export function StoreVideo() {
  return (
    <section id="recorrido" className={styles.section} aria-label={storeVideo.title}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>ÓPTICA &amp; CRISTAL</p>
        <h2>{storeVideo.title}</h2>
        <p>Conoce el espacio donde te ayudamos a elegir tu próxima mirada.</p>
        <p className={styles.address}>Huérfanos 713 · Local 18 · Santiago Centro</p>
      </div>
      <figure className={styles.figure}>
        <video
          controls
          playsInline
          muted
          preload="none"
          poster={storeVideo.poster}
          width={1080}
          height={1920}
          aria-label={storeVideo.title}
        >
          <source src={storeVideo.src} type="video/mp4" />
          <a href={storeVideo.src}>Ver el video de la óptica</a>
        </video>
        <figcaption>Una visita a nuestro local.</figcaption>
      </figure>
    </section>
  );
}
