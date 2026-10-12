import type { Metadata } from "next";
import { brand, store } from "@/components/site/content";
import { CONVENIO } from "@/lib/convenios";

export const SITE_NAME = brand.name;
export const SITE_URL = "https://opticaycristal.cl";
export const SLOGAN = "Tu mirada, nuestra prioridad";

export const AI_CRAWLERS = [
  "*",
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Applebot-Extended",
] as const;

const discount = CONVENIO.discountPercent;

export type SeoEntry = {
  title: string;
  description: string;
  path: string;
  keywords: readonly string[];
  image: string;
  imageAlt: string;
};

export const seoPages = {
  home: {
    title: `${SITE_NAME} | ${SLOGAN}`,
    description: `Óptica en ${store.fullAddress}. Vistas del local, lentes, jornadas oftalmológicas y convenio de empresas con ${discount}% en la compra online.`,
    path: "/",
    keywords: [
      "óptica Santiago Centro",
      "Óptica & Cristal",
      "lentes ópticos",
      "lentes de sol",
      "vistas de la óptica",
      "jornadas oftalmológicas",
      "convenio con empresas",
      "descuento compra online lentes",
    ],
    image: "/images/home/hero-optical-boutique-v3.webp",
    imageAlt: "Interior de Óptica & Cristal en Santiago Centro, con vitrinas de lentes",
  },
  optica: {
    title: "Vistas de la óptica",
    description: `Vistas de la óptica en Santiago Centro: lentes ópticos, de sol y accesorios. Con convenio de empresa, ${discount}% de descuento en la compra online y en el local.`,
    path: "/optica",
    keywords: [
      "vistas de la óptica",
      "óptica Santiago Centro",
      "lentes ópticos",
      "lentes de sol",
      "comprar lentes online",
      "óptica Huérfanos",
      "despacho de lentes",
      "20% compra online convenio",
    ],
    image: "/images/home/hero-optical-store-v2.webp",
    imageAlt: "Muro de monturas en la óptica de Huérfanos 713, Santiago Centro",
  },
  jornadas: {
    title: "Jornadas oftalmológicas",
    description: "Jornadas oftalmológicas para empresas en Chile. Coordinamos la atención visual en tus instalaciones y la fecha con tu equipo.",
    path: "/jornadas",
    keywords: [
      "jornadas oftalmológicas",
      "jornadas oftalmológicas para empresas",
      "chequeo visual empresas",
      "salud visual laboral",
      "atención visual en empresas",
      "operativo visual Chile",
    ],
    image: "/images/hero-consulta-oftalmologica.png",
    imageAlt: "Evaluación visual durante una jornada oftalmológica",
  },
  convenios: {
    title: "Convenio con empresas",
    description: `Convenio con empresas: ${discount}% de descuento en la compra online y en la óptica para trabajadores y familiares, más consulta visual gratuita.`,
    path: "/convenios",
    keywords: [
      "convenio con empresas",
      "convenio óptica empresas",
      "20% descuento lentes",
      "20% compra online",
      "descuento trabajadores lentes",
      "consulta visual gratuita empresas",
      "cuotas por nómina lentes",
    ],
    image: "/images/hero-equipo-trabajo.png",
    imageAlt: "Equipo de trabajo de una empresa que puede acceder al convenio de Óptica & Cristal",
  },
  privacidad: {
    title: "Política de privacidad",
    description: "Cómo Óptica & Cristal trata los datos personales de quienes escriben, compran o solicitan una jornada oftalmológica o un convenio.",
    path: "/privacidad",
    keywords: ["política de privacidad", "datos personales", "Óptica & Cristal"],
    image: brand.logo,
    imageAlt: "Logo de Óptica & Cristal",
  },
} as const satisfies Record<string, SeoEntry>;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(page: SeoEntry): Metadata {
  const url = absoluteUrl(page.path);
  const fullTitle = page.path === "/" ? page.title : `${page.title} | ${SITE_NAME}`;
  return {
    title: page.path === "/" ? { absolute: page.title } : page.title,
    description: page.description,
    keywords: [...page.keywords],
    alternates: { canonical: url, languages: { "es-CL": url } },
    openGraph: {
      title: fullTitle,
      description: page.description,
      url,
      siteName: SITE_NAME,
      locale: "es_CL",
      type: "website",
      images: [{ url: page.image, alt: page.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: page.description,
      images: [page.image],
    },
  };
}

export function llmsText(): string {
  const home = absoluteUrl("/");
  const optica = absoluteUrl("/optica");
  const gallery = `${home}#galeria`;
  const jornadas = absoluteUrl("/jornadas");
  const convenios = absoluteUrl("/convenios");

  return `# ${SITE_NAME}

> Óptica en ${store.fullAddress}, Chile. Lentes ópticos, lentes de sol y accesorios. Jornadas oftalmológicas para empresas y convenio con ${discount}% de descuento en la compra online y en la óptica para trabajadores y familiares.

Sitio oficial: ${home}
WhatsApp: ${brand.phone}
Instagram: ${brand.instagram}
Correo: contacto@opticaycristal.cl
Slogan: ${SLOGAN}

## Vistas de la óptica

- [Vistas de la óptica](${optica}): lentes ópticos, lentes de sol, accesorios y compra online con despacho a domicilio.
- [Fotos del local](${gallery}): interior de la óptica, vitrinas y muro de monturas en Santiago Centro.
- Dirección: ${store.fullAddress}.

## Jornadas oftalmológicas

- [Jornadas oftalmológicas](${jornadas}): atención visual coordinada en las instalaciones de la empresa. La fecha, el lugar y las condiciones se acuerdan con la empresa.

## Convenio con empresas

- [Convenio con empresas](${convenios}): para empresas con más de ${CONVENIO.minWorkers - 1} trabajadores.
- El ${discount}% de descuento aplica en la compra online y en la óptica.
- El beneficio es para los trabajadores de la empresa registrada y sus familiares.
- Incluye consulta visual gratuita.
- Hasta ${CONVENIO.maxInstallments} cuotas por nómina solo si la empresa firma un contrato. Enviar el formulario no firma ese contrato.
- Con cuotas, la empresa paga a Óptica & Cristal y descuenta las cuotas de la nómina del trabajador.

## Límite del descuento

El ${discount}% no es una promoción abierta a cualquier visita a la web. Corresponde al convenio que la empresa registra con Óptica & Cristal.
`;
}
