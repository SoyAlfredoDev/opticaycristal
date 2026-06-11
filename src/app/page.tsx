import Footer from "@/components/layout/Footer";
import MobileBottomCta from "@/components/layout/MobileBottomCta";
import HeroSection from "@/components/sections/HeroSection";
import ProblemSection from "@/components/sections/ProblemSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import OpticaSection from "@/components/sections/OpticaSection";
import ContratarSection from "@/components/sections/ContratarSection";

export default function Home() {
  return (
    <>
      <main id="contenido-principal" className="app-shell min-h-screen bg-background">
        <HeroSection />
        <ProblemSection />
        <BenefitsSection />
        <OpticaSection />
        <ContratarSection />
        <Footer />
      </main>
      <MobileBottomCta />
    </>
  );
}
