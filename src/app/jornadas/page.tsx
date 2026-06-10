import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import JornadasHero from "@/components/jornadas/JornadasHero";
import JornadasForm from "@/components/jornadas/JornadasForm";
import HowItWorksSection from "@/components/sections/HowItWorksSection";

export const metadata: Metadata = {
  title: "Solicitar Jornada Oftalmológica | Óptica y Cristal Chile",
  description:
    "Solicita una jornada oftalmológica para tu empresa. Chequeos visuales y venta de lentes en terreno, sin costo para la organización.",
  openGraph: {
    title: "Solicitar Jornada Oftalmológica | Óptica y Cristal Chile",
    description:
      "Coordina una jornada oftalmológica en tu empresa. Atención profesional en terreno para tus colaboradores.",
    url: "https://opticaycristal.cl/jornadas",
    siteName: "Óptica y Cristal Chile",
    locale: "es_CL",
    type: "website",
  },
};

export default function JornadasPage() {
  return (
    <main id="contenido-principal" className="min-h-screen bg-background">
      <Navbar />
      <JornadasHero />
      <HowItWorksSection ctaHref="#solicitar" ctaLabel="Solicitar jornada" />
      <JornadasForm />
      <Footer />
    </main>
  );
}
