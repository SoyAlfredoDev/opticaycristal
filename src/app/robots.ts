import type { MetadataRoute } from "next";
import { AI_CRAWLERS, absoluteUrl, SITE_URL } from "@/lib/seo";

const privatePaths = ["/admin", "/api"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: [...AI_CRAWLERS],
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
