import { BRAND_SLOGAN_LINES } from "@/lib/brand";
import { MessageCircle } from "lucide-react";
import { HeroPortraits } from "./HeroPortraits";
import hero from "./HomeHero.module.css";
import { LinkButton } from "./LinkButton";
import { editorialFont } from "./editorial-font";
import { whatsappUrl } from "./content";

export function HomeHero() {
  return (
    <section id="inicio" aria-labelledby="home-title" className={`${hero.hero} ${editorialFont.variable}`}>
        <div className={hero.background} aria-hidden="true" />
        <svg className={hero.curveDesktop} viewBox="0 0 1440 620" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 0H520C650 155 655 440 555 620H0Z" fill="var(--oc-wine)" />
          <path d="M520 0C650 155 655 440 555 620" fill="none" stroke="var(--oc-wine)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className={hero.layout}>
          <div className={hero.copy}>
            <span className={hero.eyebrow}>Lentes para tu día a día</span>
            <h1 id="home-title">{BRAND_SLOGAN_LINES[0]}<br /><em>{BRAND_SLOGAN_LINES[1]}</em></h1>
            <p>Encuentra los lentes que van contigo.<br />Te acompañamos a elegir.</p>
            <div className={hero.actions}>
              <LinkButton href="/optica" arrow>Explorar lentes</LinkButton>
              <LinkButton href={whatsappUrl("Hola, me gustaría recibir asesoría para elegir mis lentes.")} variant="outline" target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp</LinkButton>
            </div>
            <svg className={hero.curveMobile} viewBox="0 0 390 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d="M0 0H390V4Q195 40 0 4Z" fill="var(--oc-wine)" />
              <path d="M0 4Q195 40 390 4" fill="none" stroke="var(--oc-wine)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <HeroPortraits controls={false} />
        </div>
    </section>
  );
}
