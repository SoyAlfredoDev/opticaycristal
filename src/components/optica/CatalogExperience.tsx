"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Eye, Handshake, Store } from "lucide-react";
import { whatsappUrl } from "@/components/site/content";
import { CONVENIO } from "@/lib/convenios";
import { CartExperience } from "./CartExperience";
import type { Category } from "./catalog";
import site from "@/components/site/Site.module.css";
import styles from "./CatalogEditorial.module.css";

const groups = [
  { id: "opticos", title: "Lentes ópticos", image: "/images/catalog/editorial-opticos-v1.webp", alt: "Montura redonda metálica dorada, imagen referencial" },
  { id: "sol", title: "Lentes de sol", image: "/images/catalog/editorial-sol-v1.webp", alt: "Lentes de sol de carey, imagen referencial" },
  { id: "accesorios", title: "Accesorios", image: "/images/catalog/editorial-accesorios-v1.webp", alt: "Estuche vino, paño y limpiador, imagen referencial" },
] as const;

export function CatalogExperience() {
  const [category, setCategory] = useState<Category>("todos");
  const collection = useRef<HTMLElement>(null);
  function explore(next: Category) {
    setCategory(next);
    const section = collection.current;
    if (!section) return;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  return <>
    <section className={styles.hero} aria-labelledby="catalog-hero-title">
      <div className={site.container}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Encuentra tu estilo</p>
          <h1 id="catalog-hero-title">Diferentes estilos.<br /><em>Una mirada muy tuya.</em></h1>
          <p className={styles.heroDescription}>Lentes ópticos, lentes de sol y accesorios para acompañarte cada día.</p>
        </div>
        <div className={styles.heroProducts}>
          {groups.map(group => <button key={group.id} type="button" onClick={() => explore(group.id)} className={styles.heroProduct} aria-label={`Explorar ${group.title.toLowerCase()}`}>
            <span className={styles.heroProductImage}><Image src={group.image} alt={group.alt} fill sizes="(min-width: 760px) 32vw, 90vw" priority /></span>
            <span className={styles.heroProductLabel}>{group.title}<ArrowUpRight size={18} aria-hidden="true" /></span>
          </button>)}
        </div>
        <p className={styles.imageNote}>Imágenes referenciales. Consulta modelos y disponibilidad.</p>
      </div>
    </section>
    <nav aria-label="Beneficios y atención" className={styles.benefits}>
      <div className={site.container}>
        <Link href="/convenios"><Handshake aria-hidden="true" /><span><strong>Beneficios y convenios</strong><small>{CONVENIO.discountPercent}% con convenio de empresa. Consulta condiciones.</small></span><ArrowRight size={17} aria-hidden="true" /></Link>
        <a href={whatsappUrl("Hola, necesito asesoría para elegir mis lentes.")} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" /><span><strong>Asesoría personalizada</strong><small>Te ayudamos a encontrar lo que necesitas.</small></span></a>
        <a href="#visita"><Store aria-hidden="true" /><span><strong>Visítanos en Santiago Centro</strong><small>Prueba y elige con nuestra asesoría.</small></span></a>
      </div>
    </nav>
    <section id="coleccion" ref={collection} tabIndex={-1} aria-labelledby="collection-title" className={`${site.container} ${styles.collection}`}>
      <CartExperience category={category} onCategoryChange={setCategory} />
    </section>
  </>;
}
