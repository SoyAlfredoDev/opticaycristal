export const GALLERY_SET_WIDTH = 3360;
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

/** Only customer-submitted photos and the real store interior appear here. */
const storePhoto: GalleryPhoto = {
  id: "interior-huerfanos-713-local-18",
  src: "/images/local/interior-huerfanos-713-local-18.webp",
  alt: "Interior real de Óptica & Cristal en Huérfanos 713, local 18",
  fit: "cover",
  position: "center",
  x: 2920,
  y: 120,
  w: 252,
  h: 300,
  z: 1,
};

const newPhotos: readonly GalleryPhoto[] = [
  {id:"cliente-nuevo-01",src:"/images/clientes/cliente-nuevo-01.webp",alt:"Clienta con lentes de sol y estuche verde en nuestra óptica",fit:"cover",position:"center 28%",x:0,y:40,w:220,h:292,z:1},
  {id:"cliente-nuevo-02",src:"/images/clientes/cliente-nuevo-02.webp",alt:"Cliente con gorra y estuche rojo en nuestra óptica",fit:"cover",position:"center 28%",x:280,y:150,w:230,h:308,z:1},
  {id:"cliente-nuevo-03",src:"/images/clientes/cliente-nuevo-03.webp",alt:"Clienta con lentes ópticos y estuche claro en nuestra óptica",fit:"cover",position:"center 28%",x:560,y:80,w:226,h:302,z:1},
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

export const galleryPhotos: readonly GalleryPhoto[] = [
  ...newPhotos,
  ...customerPhotos.map((photo) => ({ ...photo, x: photo.x + 840 })),
  storePhoto,
];
