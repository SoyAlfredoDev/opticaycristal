import { CollectionGallery } from "./CollectionGallery";
import { SectionReveal } from "./SectionReveal";
import styles from "@/components/site/Site.module.css";
import editorial from "./EditorialHome.module.css";
import { editorialFont } from "./editorial-font";

export function CollectionsSection() {
  return (
    <section id="colecciones" aria-labelledby="collections-title" className={`${editorial.scope} ${editorial.collections} ${editorialFont.variable}`}>
      <div className={styles.container}>
      <SectionReveal className={styles.revealGallery}>
        <div className={editorial.sectionHeading}>
          <h2 id="collections-title">Encuentra tu próxima mirada</h2>
          <span className={styles.sectionCaption}>Estilo en cada etapa de tu vida</span>
        </div>
        <CollectionGallery />
      </SectionReveal>
      </div>
    </section>
  );
}
