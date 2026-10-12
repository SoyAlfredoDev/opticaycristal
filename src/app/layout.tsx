import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { JornadaModalProvider } from "@/components/forms/JornadaModalProvider";
import { JsonLd } from "@/components/site/JsonLd";
import { seoPages, SITE_NAME, SITE_URL } from "@/lib/seo";
import { siteJsonLd } from "@/lib/structured-data";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["italic", "normal"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: seoPages.home.title,
    template: `%s | ${SITE_NAME}`,
  },
  description: seoPages.home.description,
  applicationName: SITE_NAME,
  keywords: [...seoPages.home.keywords],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Óptica",
  alternates: { canonical: SITE_URL, languages: { "es-CL": SITE_URL } },
  openGraph: {
    title: seoPages.home.title,
    description: seoPages.home.description,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "es_CL",
    type: "website",
    images: [{ url: seoPages.home.image, alt: seoPages.home.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: seoPages.home.title,
    description: seoPages.home.description,
    images: [seoPages.home.image],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${outfit.className} ${playfair.variable} antialiased bg-background text-text-primary`}
      >
        <a
          href="#contenido-principal"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-surface focus:rounded-full focus:text-sm focus:font-semibold"
        >
          Saltar al contenido
        </a>
        <JsonLd data={siteJsonLd()} />
        <JornadaModalProvider>{children}</JornadaModalProvider>
      </body>
    </html>
  );
}
