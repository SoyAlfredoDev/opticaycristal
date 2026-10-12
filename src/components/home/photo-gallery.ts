export const GALLERY_SET_WIDTH = 2120;
export const GALLERY_SET_HEIGHT = 500;

export type GalleryPhoto = Readonly<{
  id: string;
  src: string;
  alt: string;
  fit: "cover" | "contain";
  position: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}>;

/** One scattered cluster. The marquee repeats it so the loop has no seam. */
export const galleryPhotos: readonly GalleryPhoto[] = [
  {
    id: "boutique",
    src: "/images/home/hero-optical-boutique-v3.webp",
    alt: "Interior de Óptica & Cristal en Santiago Centro, con vitrinas de lentes",
    fit: "cover",
    position: "center 72%",
    x: 0,
    y: 120,
    w: 252,
    h: 300,
    z: 1,
  },
  {
    id: "joven",
    src: "/images/home/hero-young-extended-v5.png",
    alt: "Cliente con lentes de sol",
    fit: "contain",
    position: "center",
    x: 318,
    y: 36,
    w: 172,
    h: 208,
    z: 1,
  },
  {
    id: "vitrina",
    src: "/images/home/hero-optical-store-v2.webp",
    alt: "Muro de monturas en la óptica de Huérfanos 713",
    fit: "cover",
    position: "center 42%",
    x: 548,
    y: 150,
    w: 154,
    h: 168,
    z: 1,
  },
  {
    id: "mirada",
    src: "/images/home/hero-editorial-kenneth-surillo.jpg",
    alt: "Cliente sosteniendo sus lentes",
    fit: "cover",
    position: "center 16%",
    x: 662,
    y: 258,
    w: 208,
    h: 178,
    z: 3,
  },
  {
    id: "pareja",
    src: "/images/home/hero-professional-v4.png",
    alt: "Pareja de clientes con lentes de sol",
    fit: "contain",
    position: "center",
    x: 936,
    y: 28,
    w: 244,
    h: 196,
    z: 1,
  },
  {
    id: "consulta",
    src: "/images/hero-consulta-oftalmologica.png",
    alt: "Atención visual a una clienta en la óptica",
    fit: "cover",
    position: "center",
    x: 1112,
    y: 188,
    w: 230,
    h: 170,
    z: 2,
  },
  {
    id: "asesora",
    src: "/images/hero-professional-woman2.png",
    alt: "Clienta con lentes ópticos",
    fit: "cover",
    position: "78% 42%",
    x: 1496,
    y: 40,
    w: 164,
    h: 214,
    z: 1,
  },
  {
    id: "jornada",
    src: "/images/hero-jornada-optica.png",
    alt: "Evaluación visual durante una jornada",
    fit: "cover",
    position: "center",
    x: 1724,
    y: 178,
    w: 210,
    h: 192,
    z: 1,
  },
];
