export const categories = [
  { id: "todos", label: "Todos" }, { id: "opticos", label: "Lentes ópticos" },
  { id: "sol", label: "Lentes de sol" }, { id: "accesorios", label: "Accesorios" },
] as const;
export type Category = typeof categories[number]["id"];
export type Product = Readonly<{ id: string; title: string; category: Exclude<Category, "todos">; image: string; alt: string; shape?: string; material?: string; color: string; description: string; cutout?: boolean }>;
export const products: readonly Product[] = [
  { id: "cat-eye", title: "Montura cat eye", category: "opticos", image: "/images/catalog/oc-cat-eye-v01.png", alt: "Montura óptica vinotinto con detalles dorados, imagen referencial", shape: "Cat eye", material: "Acetato", color: "Burdeos", description: "Líneas suaves y detalles dorados. Consulta las opciones de montura y cristales con nuestro equipo." },
  { id: "redonda", title: "Montura redonda", category: "opticos", image: "/images/catalog/oc-round-v01.png", alt: "Montura redonda de metal dorado sobre piedra clara, imagen referencial", shape: "Redondos", material: "Metal", color: "Dorado", description: "Una silueta ligera de inspiración clásica. Te ayudamos a encontrar una alternativa que se ajuste a tu estilo." },
  { id: "rectangular", title: "Montura rectangular", category: "opticos", image: "/images/catalog/oc-rectangular-v01.png", alt: "Montura rectangular negra sobre piedra clara, imagen referencial", shape: "Rectangulares", material: "Acetato", color: "Negro", description: "Líneas definidas para el día a día. Consulta medidas y modelos disponibles antes de comprar." },
  { id: "sol", title: "Lentes de sol", category: "sol", image: "/images/home/oc-lentes-sol-v01.png", alt: "Lentes de sol de carey sobre piedra clara, imagen referencial", shape: "Redondos", material: "Acetato", color: "Carey", description: "Una propuesta para acompañarte al aire libre. Consulta las características y disponibilidad de cada modelo." },
  { id: "estuche", title: "Estuche y accesorios", category: "accesorios", image: "/images/home/oc-accesorios-v01.png", alt: "Estuche vinotinto, paño y limpiador, imagen referencial", color: "Burdeos", description: "Accesorios para guardar y cuidar tus lentes. Consulta opciones de estuches y paños disponibles." },
  { id: "limpieza", title: "Kit de limpieza", category: "accesorios", image: "/images/catalog/oc-cleaning-v01.png", alt: "Limpiador de lentes y paño de microfibra, imagen referencial", color: "Negro", description: "Complementos para el cuidado cotidiano de tus lentes. Te orientamos sobre su uso y las opciones disponibles." },
];
export type CatalogFilters = { category: Category; search: string; shapes: readonly string[]; materials: readonly string[]; colors: readonly string[]; sort: "featured" | "az" | "za" };
export const initialFilters: CatalogFilters = { category: "todos", search: "", shapes: [], materials: [], colors: [], sort: "featured" };
function normalize(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
export function filterProducts(filters: CatalogFilters): readonly Product[] {
  const query = normalize(filters.search.trim());
  const result = products.filter((product) =>
    (filters.category === "todos" || product.category === filters.category) &&
    (!query || normalize(`${product.title} ${product.color} ${product.material ?? ""} ${product.description}`).includes(query)) &&
    (!filters.shapes.length || !!product.shape && filters.shapes.includes(product.shape)) &&
    (!filters.materials.length || !!product.material && filters.materials.includes(product.material)) &&
    (!filters.colors.length || filters.colors.includes(product.color))
  );
  return filters.sort === "featured" ? result : result.toSorted((a, b) => filters.sort === "az" ? a.title.localeCompare(b.title, "es") : b.title.localeCompare(a.title, "es"));
}
