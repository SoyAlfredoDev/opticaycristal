export const brand = {
  name: "Óptica & Cristal",
  phone: "+56 9 2245 2080",
  instagram: "https://www.instagram.com/opticaycristal.cl/",
  instagramLabel: "@opticaycristal.cl",
  website: "https://opticaycristal.cl",
  logo: "/images/home/oc-logo-oficial.png",
} as const;

export function whatsappUrl(message?: string): string {
  const base = "https://wa.me/56922452080";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const store = {
  street: "Huérfanos 713",
  unit: "Local 18",
  locality: "Santiago Centro",
  fullAddress: "Huérfanos 713, local 18, Santiago Centro",
  mapsQuery: "Huérfanos 713, Santiago Centro, Santiago, Chile",
} as const;

export type StorePhoto = {
  src: string;
  alt: string;
};

/**
 * Fotos reales del local. Para publicar una, guarda el archivo en
 * public/images/local/ y agrega aquí { src: "/images/local/archivo.jpg", alt: "qué se ve" }.
 */
export const storePhotos: readonly StorePhoto[] = [];

const encodedStoreQuery = encodeURIComponent(store.mapsQuery);

export function storeMapUrl(mode: "embed" | "directions" | "search"): string {
  if (mode === "embed") return `https://maps.google.com/maps?q=${encodedStoreQuery}&hl=es&z=17&output=embed`;
  if (mode === "directions") return `https://www.google.com/maps/dir/?api=1&destination=${encodedStoreQuery}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodedStoreQuery}`;
}

export const siteNavigation = [
  { label: "Inicio", footerLabel: "Inicio", href: "/" },
  { label: "Óptica", footerLabel: "Vistas de la óptica", href: "/optica" },
  { label: "Convenios", footerLabel: "Convenio con empresas", href: "/convenios" },
  { label: "Jornadas", footerLabel: "Jornadas oftalmológicas", href: "/jornadas" },
] as const;
