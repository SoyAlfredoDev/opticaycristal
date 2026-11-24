export const GALLERY_SET_HEIGHT = 620;
const GALLERY_GAP = 20;

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
  y: 100,
  w: 312,
  h: 416,
  z: 1,
};

const newPhotos: readonly GalleryPhoto[] = [
  {id:"cliente-nuevo-01",src:"/images/clientes/cliente-nuevo-01.webp",alt:"Clienta con lentes de sol y estuche verde en nuestra óptica",fit:"cover",position:"center 28%",x:0,y:120,w:324,h:432,z:1},
  {id:"cliente-nuevo-02",src:"/images/clientes/cliente-nuevo-02.webp",alt:"Cliente con gorra y estuche rojo en nuestra óptica",fit:"cover",position:"center 28%",x:280,y:230,w:218,h:291,z:1},
  {id:"cliente-nuevo-03",src:"/images/clientes/cliente-nuevo-03.webp",alt:"Clienta con lentes ópticos y estuche claro en nuestra óptica",fit:"cover",position:"center 28%",x:560,y:80,w:280,h:373,z:1},
];

const recentPhotos: readonly GalleryPhoto[] = [
  {id:"cliente-0778",src:"/images/clientes/cliente-0778.webp",alt:"Cliente con camisa verde, lentes ópticos y bolsa roja en nuestra óptica",fit:"cover",position:"center 28%",x:0,y:40,w:300,h:400,z:1},
  {id:"cliente-0781",src:"/images/clientes/cliente-0781.webp",alt:"Clienta con blusa rosa, lentes ópticos y bolsa roja en nuestra óptica",fit:"cover",position:"center 28%",x:280,y:240,w:204,h:272,z:1},
  {id:"cliente-0782",src:"/images/clientes/cliente-0782.webp",alt:"Cliente con gorra, camisa beige y bolsa roja en nuestra óptica",fit:"cover",position:"center 28%",x:560,y:24,w:260,h:347,z:1},
  {id:"cliente-0785",src:"/images/clientes/cliente-0785.webp",alt:"Cliente con camiseta negra y lentes ópticos en nuestra óptica",fit:"cover",position:"center 28%",x:840,y:170,w:224,h:299,z:1},
];

const customerPhotos: readonly GalleryPhoto[] = [
  {id:"cliente-0360",src:"/images/clientes/cliente-0360-hd-v1.webp",alt:"Clienta con montura óptica clara",fit:"cover",position:"center 28%",x:0,y:260,w:200,h:270,z:1,tone:"brightness(1.08) contrast(1.02) saturate(.90)"},
  {id:"cliente-0361",src:"/images/clientes/cliente-0361-hd-v1.webp",alt:"Clienta con lentes ópticos y camisa verde",fit:"cover",position:"center 28%",x:280,y:60,w:296,h:396,z:1,tone:"brightness(1.03) contrast(1.02) saturate(.87)"},
  {id:"cliente-0362",src:"/images/clientes/cliente-0362-hd-v1.webp",alt:"Cliente con gorra y lentes ópticos",fit:"cover",position:"center 28%",x:560,y:180,w:236,h:315,z:1,tone:"brightness(1.05) contrast(.98) saturate(.80)"},
  {id:"cliente-0363",src:"/images/clientes/cliente-0363-hd-v1.webp",alt:"Cliente con lentes ópticos y audífonos",fit:"cover",position:"center 28%",x:840,y:130,w:320,h:426,z:1,tone:"brightness(1.02) contrast(.98) saturate(.82) sepia(.05)"},
  {id:"cliente-0365",src:"/images/clientes/cliente-0365-hd-v1.webp",alt:"Clienta con montura óptica y blusa de rayas",fit:"cover",position:"center 28%",x:1120,y:240,w:208,h:280,z:1,tone:"brightness(1.10) contrast(1.02) saturate(.88)"},
  {id:"cliente-0366",src:"/images/clientes/cliente-0366-hd-v1.webp",alt:"Dos clientes con lentes en la óptica",fit:"cover",position:"center 28%",x:1400,y:30,w:272,h:364,z:1,tone:"brightness(1.10) contrast(1.06) saturate(.92)"},
  {id:"cliente-0367",src:"/images/clientes/cliente-0367-hd-v1.webp",alt:"Cliente joven mostrando sus lentes ópticos",fit:"cover",position:"center 28%",x:1680,y:190,w:232,h:310,z:1,tone:"brightness(1.04) contrast(.99) saturate(.84)"},
];

const photos: readonly GalleryPhoto[] = [
  ...recentPhotos,
  ...newPhotos,
  ...customerPhotos,
  storePhoto,
];

export const galleryPhotos: readonly GalleryPhoto[] = photos.map((photo, index) => ({
  ...photo,
  x: photos.slice(0, index).reduce((width, item) => width + item.w + GALLERY_GAP, 0),
}));

export const GALLERY_SET_WIDTH = photos.reduce((width, photo) => width + photo.w + GALLERY_GAP, 0);
// Keep the same pace when photographs are added or the spacing changes.
export const GALLERY_DURATION_SECONDS = GALLERY_SET_WIDTH / 60;
