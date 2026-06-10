import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} antialiased text-slate-800 bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}
