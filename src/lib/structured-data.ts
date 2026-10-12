import { galleryPhotos } from "@/components/home/photo-gallery";
import { brand, store, storeMapUrl } from "@/components/site/content";
import { CONVENIO, convenioFaqs } from "@/lib/convenios";
import { absoluteUrl, seoPages, SITE_NAME, SITE_URL, SLOGAN } from "@/lib/seo";

const opticianId = `${SITE_URL}/#optician`;

const storeViews = [
  seoPages.home.image,
  seoPages.optica.image,
  "/images/home/hero-optical-boutique-v3.webp",
] as const;

function imageObject(src: string, description: string) {
  return {
    "@type": "ImageObject",
    contentUrl: absoluteUrl(src),
    description,
  };
}

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Optician", "LocalBusiness"],
        "@id": opticianId,
        name: SITE_NAME,
        url: SITE_URL,
        slogan: SLOGAN,
        image: [...new Set(storeViews)].map((src) => absoluteUrl(src)),
        logo: absoluteUrl(brand.logo),
        telephone: "+56922452080",
        email: "contacto@opticaycristal.cl",
        address: {
          "@type": "PostalAddress",
          streetAddress: `${store.street}, local 18`,
          addressLocality: store.locality,
          addressRegion: "Región Metropolitana",
          addressCountry: "CL",
        },
        hasMap: storeMapUrl("search"),
        sameAs: [brand.instagram],
        areaServed: { "@type": "Country", name: "Chile" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "es-CL",
        publisher: { "@id": opticianId },
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#paginas`,
        name: "Páginas de Óptica & Cristal",
        itemListElement: [
          listItem(1, "Vistas de la óptica", seoPages.optica),
          listItem(2, "Jornadas oftalmológicas", seoPages.jornadas),
          listItem(3, "Convenio con empresas", seoPages.convenios),
        ],
      },
    ],
  };
}

function listItem(position: number, name: string, page: { path: string; description: string }) {
  return {
    "@type": "ListItem",
    position,
    name,
    url: absoluteUrl(page.path),
    description: page.description,
  };
}

function breadcrumb(pageName: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: pageName, item: absoluteUrl(path) },
    ],
  };
}

export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${SITE_URL}/#galeria`,
    name: "Vistas de la óptica",
    description: "Interior de Óptica & Cristal en Huérfanos 713, Santiago Centro: vitrinas, muro de monturas y atención en el local.",
    url: `${SITE_URL}/#galeria`,
    about: { "@id": opticianId },
    image: galleryPhotos.map((photo) => imageObject(photo.src, photo.alt)),
  };
}

export function opticaJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb(seoPages.optica.title, seoPages.optica.path),
      {
        "@type": "CollectionPage",
        "@id": `${absoluteUrl("/optica")}#pagina`,
        name: seoPages.optica.title,
        description: seoPages.optica.description,
        url: absoluteUrl("/optica"),
        inLanguage: "es-CL",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": opticianId },
        primaryImageOfPage: imageObject(seoPages.optica.image, seoPages.optica.imageAlt),
      },
    ],
  };
}

export function jornadasJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb(seoPages.jornadas.title, seoPages.jornadas.path),
      {
        "@type": "Service",
        "@id": `${absoluteUrl("/jornadas")}#servicio`,
        name: "Jornadas oftalmológicas para empresas",
        serviceType: "Jornada oftalmológica",
        description: seoPages.jornadas.description,
        url: absoluteUrl("/jornadas"),
        provider: { "@id": opticianId },
        areaServed: { "@type": "Country", name: "Chile" },
        image: absoluteUrl(seoPages.jornadas.image),
      },
    ],
  };
}

export function conveniosJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb(seoPages.convenios.title, seoPages.convenios.path),
      {
        "@type": "Service",
        "@id": `${absoluteUrl("/convenios")}#servicio`,
        name: "Convenio con empresas",
        serviceType: "Convenio de óptica para trabajadores",
        description: seoPages.convenios.description,
        url: absoluteUrl("/convenios"),
        provider: { "@id": opticianId },
        areaServed: { "@type": "Country", name: "Chile" },
        audience: {
          "@type": "BusinessAudience",
          name: `Empresas con ${CONVENIO.minWorkers} o más trabajadores`,
        },
        offers: {
          "@type": "Offer",
          name: `${CONVENIO.discountPercent}% de descuento en la compra online y en la óptica`,
          description: `Trabajadores y familiares de la empresa registrada reciben ${CONVENIO.discountPercent}% de descuento en la web y en el local. La consulta visual gratuita va incluida. Hasta ${CONVENIO.maxInstallments} cuotas por nómina requieren contrato.`,
          url: absoluteUrl("/convenios"),
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${absoluteUrl("/convenios")}#preguntas`,
        url: absoluteUrl("/convenios"),
        mainEntity: convenioFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
