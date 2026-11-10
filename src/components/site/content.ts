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
  mapsQuery: "Huérfanos 713, local 18, Santiago Centro, Santiago, Chile",
} as const;

export type StorePhoto = {
  src: string;
  alt: string;
};

/**
 * Fotos reales del local. Para publicar una, guarda el archivo en
 * public/images/local/ y agrega aquí { src: "/images/local/archivo.jpg", alt: "qué se ve" }.
 */
export const storePhotos: readonly StorePhoto[] = [
  { src: "/images/local/interior-huerfanos-713-local-18.webp", alt: "Interior de Óptica & Cristal, Huérfanos 713, local 18" },
];

export const storeVideo = {
  src: "/videos/recorrido-optica-local-18.mp4",
  poster: "/images/local/recorrido-optica-poster.webp",
  title: "Un recorrido por nuestra óptica",
} as const;

const encodedStoreQuery = encodeURIComponent(store.mapsQuery);

export function storeMapUrl(mode: "embed" | "directions" | "search", zoom = 17): string {
  if (mode === "embed") return `https://maps.google.com/maps?q=${encodedStoreQuery}&hl=es&z=${zoom}&output=embed`;
  if (mode === "directions") return `https://www.google.com/maps/dir/?api=1&destination=${encodedStoreQuery}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodedStoreQuery}`;
}

export const siteNavigation = [
  { label: "Inicio", footerLabel: "Inicio", href: "/" },
  { label: "Óptica", footerLabel: "Vistas de la óptica", href: "/optica" },
  { label: "Crédito directo", footerLabel: "Crédito directo", href: "/credito-directo" },
  { label: "Convenios", footerLabel: "Convenio con empresas", href: "/convenios" },
  { label: "Jornadas", footerLabel: "Jornadas oftalmológicas", href: "/jornadas" },
  { label: "Mi cuenta", footerLabel: "Mi espacio de cliente", href: "/mi-cuenta" },
] as const;

/** Published in the customer portal; exceptional dates are not configured. */
export const storeHours = [{days:[1,2,3,4,5],opens:"10:00",closes:"18:00"},{days:[6],opens:"10:00",closes:"15:00"}] as const;
