import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection, { HeroTrustStrip } from "@/components/sections/HeroSection";
import ProblemSection from "@/components/sections/ProblemSection";
import SolutionSection from "@/components/sections/SolutionSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import TrustSection from "@/components/sections/TrustSection";
import AudienceSection from "@/components/sections/AudienceSection";
import FaqSection from "@/components/sections/FaqSection";
import CtaSection from "@/components/sections/CtaSection";

export default function Home() {
  return (
    <main id="contenido-principal" className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HeroTrustStrip />
      <ProblemSection />
      <SolutionSection />
      <BenefitsSection />
      <HowItWorksSection />
      <TrustSection />
      <AudienceSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
