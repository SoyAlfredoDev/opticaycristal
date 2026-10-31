export const GALLERY_SET_WIDTH = 4200;
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
  tone?: string;
}>;

/** One scattered cluster. The marquee repeats it so the loop has no seam. */
const previousPhotos: readonly GalleryPhoto[] = [
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

const customerPhotos: readonly GalleryPhoto[] = [
  {id:"cliente-0360",src:"/images/clientes/cliente-0360-hd-v1.webp",alt:"Clienta con montura óptica clara",fit:"cover",position:"center 28%",x:0,y:70,w:212,h:272,z:1,tone:"brightness(1.08) contrast(1.02) saturate(.90)"},
  {id:"cliente-0361",src:"/images/clientes/cliente-0361-hd-v1.webp",alt:"Clienta con lentes ópticos y camisa verde",fit:"cover",position:"center 28%",x:280,y:150,w:214,h:286,z:1,tone:"brightness(1.03) contrast(1.02) saturate(.87)"},
  {id:"cliente-0362",src:"/images/clientes/cliente-0362-hd-v1.webp",alt:"Cliente con gorra y lentes ópticos",fit:"cover",position:"center 28%",x:560,y:40,w:210,h:280,z:1,tone:"brightness(1.05) contrast(.98) saturate(.80)"},
  {id:"cliente-0363",src:"/images/clientes/cliente-0363-hd-v1.webp",alt:"Cliente con lentes ópticos y audífonos",fit:"cover",position:"center 28%",x:840,y:154,w:216,h:296,z:1,tone:"brightness(1.02) contrast(.98) saturate(.82) sepia(.05)"},
  {id:"cliente-0365",src:"/images/clientes/cliente-0365-hd-v1.webp",alt:"Clienta con montura óptica y blusa de rayas",fit:"cover",position:"center 28%",x:1120,y:70,w:224,h:306,z:1,tone:"brightness(1.10) contrast(1.02) saturate(.88)"},
  {id:"cliente-0366",src:"/images/clientes/cliente-0366-hd-v1.webp",alt:"Dos clientes con lentes en la óptica",fit:"cover",position:"center 28%",x:1400,y:150,w:236,h:298,z:1,tone:"brightness(1.10) contrast(1.06) saturate(.92)"},
  {id:"cliente-0367",src:"/images/clientes/cliente-0367-hd-v1.webp",alt:"Cliente joven mostrando sus lentes ópticos",fit:"cover",position:"center 28%",x:1680,y:40,w:218,h:278,z:1,tone:"brightness(1.04) contrast(.99) saturate(.84)"},
];

export const galleryPhotos: readonly GalleryPhoto[] = [...customerPhotos, ...previousPhotos.map(photo => ({...photo, x: photo.x + 2080}))];
