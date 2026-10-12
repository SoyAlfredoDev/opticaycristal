"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DepthMedia } from "@/components/site/DepthMedia";
import { SiteDialog } from "@/components/site/SiteDialog";
import { LinkButton } from "@/components/site/LinkButton";
import { whatsappUrl } from "@/components/site/content";
import { categories, filterProducts, initialFilters, type CatalogFilters, type Product } from "./catalog";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
const groups = [
  { key: "shapes", label: "Forma", options: ["Redondos", "Rectangulares", "Cat eye"] },
  { key: "materials", label: "Material", options: ["Metal", "Acetato"] },
  { key: "colors", label: "Color", options: ["Burdeos", "Negro", "Carey", "Dorado"] },
] as const;
export function ProductCatalog({ onAddToCart, cartReady }: { onAddToCart: (product: Product) => void; cartReady: boolean }) {
  const [filters, setFilters] = useState<CatalogFilters>(initialFilters);
  const [selected, setSelected] = useState<Product | null>(null);
  const titleId = useId();
  const filtersRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const update = () => { if (filtersRef.current) filtersRef.current.open = desktop.matches; };
    update(); desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  const visible = filterProducts(filters);
  function toggle(key: "shapes" | "materials" | "colors", value: string) {
    setFilters((previous) => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter((item) => item !== value) : [...previous[key], value] }));
  }
  return <>
    <div className={styles.toolbar}>
      <div className={styles.categories} role="group" aria-label="Categorías de productos">{categories.map((category) =>
        <button key={category.id} type="button" aria-pressed={filters.category === category.id} onClick={() => setFilters((previous) => ({ ...previous, category: category.id }))}>{category.label}</button>)}
      </div>
      <div className={styles.searchGroup}><label className={styles.searchLabel}><span className="sr-only">Buscar lentes y accesorios</span><Search size={18} aria-hidden="true" />
        <input type="search" className={styles.searchInput} placeholder="Buscar lentes y accesorios" value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} />
      </label><label><span className="sr-only">Ordenar productos</span><select className={styles.sortSelect} value={filters.sort} onChange={(event) => setFilters((previous) => ({ ...previous, sort: event.target.value as CatalogFilters["sort"] }))}>
        <option value="featured">Destacados</option><option value="az">Nombre: A–Z</option><option value="za">Nombre: Z–A</option>
      </select></label></div>
    </div>
    <div className={styles.catalogLayout}>
      <details ref={filtersRef} className={styles.filters} open><summary>Filtrar productos</summary><div className={styles.filterGroups}>{groups.map((group) =>
        <fieldset key={group.key}><legend>{group.label}</legend>{group.options.map((option) => <label key={option}>
          <input type="checkbox" checked={filters[group.key].includes(option)} onChange={() => toggle(group.key, option)} />{option}
        </label>)}</fieldset>)}</div><button type="button" className={styles.clearButton} onClick={() => setFilters(initialFilters)}>Limpiar filtros</button></details>
      <div><p role="status" className={styles.resultsCount}>{visible.length} {visible.length === 1 ? "propuesta" : "propuestas"} para explorar</p>
        {visible.length ? <div className={styles.productGrid}>{visible.map((product) => <article key={product.id} className={styles.product}>
          <DepthMedia><button type="button" className={`${styles.productImage} ${product.cutout ? styles.productCutout : ""}`} onClick={() => setSelected(product)} aria-label={`Ver ${product.title.toLowerCase()}`}>
            <Image src={product.image} alt={product.alt} fill sizes="(min-width: 900px) 28vw, 45vw" quality={90} />
          </button></DepthMedia>
          <div className={styles.productInfo}><h2>{product.title}</h2><p>Consulta opciones y precio</p><button type="button" className={`${site.button} ${site.primary}`} onClick={() => onAddToCart(product)} disabled={!cartReady} aria-label={`Agregar ${product.title} al carro`}>Agregar al carro</button><button type="button" className={styles.viewProductButton} onClick={() => setSelected(product)} aria-label={`Ver producto: ${product.title}`}>Ver producto</button></div>
        </article>)}</div> : <div className={styles.empty}><h3>No encontramos coincidencias</h3><p>Prueba otra búsqueda o elimina los filtros.</p><button type="button" className={styles.clearButton} onClick={() => setFilters(initialFilters)}>Ver todas las propuestas</button></div>}
      </div>
    </div>
    <p className={styles.catalogNote}>Imágenes y productos referenciales. Consulta modelos, características, precio y disponibilidad con nuestro equipo.</p>
    <SiteDialog open={selected !== null} onClose={() => setSelected(null)} titleId={titleId} className={styles.productDialog}>
      {selected ? <><div className={`${styles.detailImage} ${selected.cutout ? styles.productCutout : ""}`}><Image src={selected.image} alt={selected.alt} fill sizes="(min-width: 900px) 800px, 95vw" quality={90} /></div>
        <div className={styles.detailCopy}><h2 id={titleId}>{selected.title}</h2><p>{selected.description}</p>
          <div className={styles.detailFacts}>{[selected.shape, selected.material, selected.color].filter(Boolean).map((fact) => <span key={fact}>{fact}</span>)}</div>
          <LinkButton href={whatsappUrl(`Hola, me interesa la propuesta ${selected.title.toLowerCase()} que vi en la web. ¿Qué modelos y precios tienen disponibles? Quisiera consultar también por despacho.`)} target="_blank" rel="noopener noreferrer" arrow>Consultar este producto</LinkButton>
          <p>Imagen referencial. Confirmaremos el modelo y las condiciones antes de comprar.</p>
        </div></> : null}
    </SiteDialog>
  </>;
}
