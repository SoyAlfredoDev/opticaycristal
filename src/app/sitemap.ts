import type { MetadataRoute } from "next";
import { galleryPhotos } from "@/components/home/photo-gallery";
import { absoluteUrl, seoPages, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const storeImages = [...new Set(galleryPhotos.map((photo) => absoluteUrl(photo.src)))];
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
      images: storeImages,
    },
    {
      url: absoluteUrl(seoPages.optica.path),
      changeFrequency: "weekly",
      priority: 0.9,
      images: [absoluteUrl(seoPages.home.image), absoluteUrl(seoPages.optica.image)],
    },
    {
      url: absoluteUrl(seoPages.jornadas.path),
      changeFrequency: "monthly",
      priority: 0.8,
      images: [absoluteUrl(seoPages.jornadas.image)],
    },
    {
      url: absoluteUrl(seoPages.convenios.path),
      changeFrequency: "monthly",
      priority: 0.8,
      images: [absoluteUrl(seoPages.convenios.image)],
    },
    {
      url: absoluteUrl(seoPages.privacidad.path),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
