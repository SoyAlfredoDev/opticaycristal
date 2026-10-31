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
        <div className={hero.layout}>
          <div className={hero.copy}>
            <span className={hero.eyebrow}>Lentes para tu día a día</span>
            <h1 id="home-title">Ver bien.<br /><em>Sentirse bien.</em></h1>
            <p>Encuentra los lentes que van contigo.<br />Te acompañamos a elegir.</p>
            <div className={hero.actions}>
              <LinkButton href="/optica" arrow>Explorar lentes</LinkButton>
              <LinkButton href={whatsappUrl("Hola, me gustaría recibir asesoría para elegir mis lentes.")} variant="outline" target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" /> Consultar por WhatsApp</LinkButton>
            </div>
            <div className={hero.signature}>Más que lentes, es tu historia.</div>
          </div>
          <HeroPortraits controls={false} />
          <span className={hero.sideNote} aria-hidden="true">Miradas que inspiran</span>
        </div>
    </section>
  );
}
