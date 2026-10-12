import { CollectionGallery } from "./CollectionGallery";
import { SectionReveal } from "./SectionReveal";
import styles from "@/components/site/Site.module.css";

export function CollectionsSection() {
  return (
    <section id="colecciones" aria-labelledby="collections-title" className={`${styles.container} ${styles.section}`}>
      <SectionReveal className={styles.revealGallery}>
        <div className={styles.sectionHeading}>
          <h2 id="collections-title">Encuentra tu próxima mirada</h2>
          <span className={styles.sectionCaption}>Estilo en cada etapa de tu vida</span>
        </div>
        <CollectionGallery />
      </SectionReveal>
    </section>
  );
}
