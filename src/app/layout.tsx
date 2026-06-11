import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
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
  title: "Jornadas Oftalmológicas para Empresas | Óptica y Cristal Chile",
  description:
    "Llevamos la salud visual a tu empresa. Chequeos visuales y venta de lentes ópticos en terreno para la comodidad y bienestar de tus trabajadores en Chile.",
  keywords: [
    "jornadas oftalmológicas para empresas",
    "chequeos visuales en empresas",
    "salud visual laboral",
    "operativos visuales para empresas",
    "evaluación visual para trabajadores",
    "lentes ópticos para trabajadores",
    "óptica en Santiago Centro",
    "servicio oftalmológico para empresas en Chile",
  ],
  openGraph: {
    title: "Jornadas Oftalmológicas para Empresas | Óptica y Cristal Chile",
    description:
      "Llevamos la salud visual a tu empresa en Santiago Centro. Chequeos visuales y venta de lentes ópticos en terreno para tus trabajadores.",
    url: "https://opticaycristal.cl",
    siteName: "Óptica y Cristal Chile",
    locale: "es_CL",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
        {children}
      </body>
    </html>
  );
}
