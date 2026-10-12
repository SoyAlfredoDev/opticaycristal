import Image from "next/image";
import { HeroPortraits } from "./HeroPortraits";
import hero from "./HomeHero.module.css";
import { LinkButton } from "./LinkButton";

export function HomeHero() {
  return (
    <section id="inicio" aria-labelledby="home-title" className={hero.hero}>
        <div className={hero.background} aria-hidden="true">
          <div className={hero.storePhoto}>
            <Image src="/images/home/hero-optical-boutique-v3.webp" alt="" fill sizes="100vw" quality={90} className={hero.storeImage} />
          </div>
        </div>
        <div className={hero.layout}>
          <div className={hero.copy}>
            <span className={hero.eyebrow}>Lentes para tu día a día</span>
            <h1 id="home-title">Ver bien.<br /><em>Sentirse bien.</em></h1>
            <p>Encuentra los lentes que van contigo.<br />Te acompañamos a elegir.</p>
            <div className={hero.actions}>
              <LinkButton href="/optica" arrow>Explorar lentes</LinkButton>
            </div>
            <div className={hero.signature}>Más que lentes,<br />es tu historia.</div>
          </div>
          <HeroPortraits />
          <span className={hero.sideNote} aria-hidden="true">Miradas que inspiran</span>
        </div>
    </section>
  );
}
