export { brand, whatsappUrl, siteNavigation as homeNavigation } from "@/components/site/content";

export type Collection = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  cutout?: boolean;
  message: string;
}>;

export const collections: readonly Collection[] = [
  {
    id: "opticos",
    title: "Lentes ópticos",
    subtitle: "Un estilo tan tuyo como tu mirada.",
    image: "/images/home/oc-lentes-opticos-v01.png",
    alt: "Armazón óptico vinotinto con detalles dorados, imagen referencial",
    cutout: true,
    message: "Hola, me gustaría conocer los lentes ópticos disponibles.",
  },
  {
    id: "sol",
    title: "Lentes de sol",
    subtitle: "Para acompañarte fuera de la rutina.",
    image: "/images/home/oc-lentes-sol-v01.png",
    alt: "Lentes de sol de carey sobre piedra clara, imagen referencial",
    message: "Hola, me gustaría conocer los lentes de sol disponibles.",
  },
  {
    id: "accesorios",
    title: "Accesorios",
    subtitle: "Los pequeños detalles que los cuidan.",
    image: "/images/home/oc-accesorios-v01.png",
    alt: "Estuche vinotinto, paño y limpiador de lentes, imagen referencial",
    message: "Hola, me gustaría consultar por accesorios para mis lentes.",
  },
];
