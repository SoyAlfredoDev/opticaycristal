import type { ReactNode } from "react";
import Image from "next/image";
import { DepthMedia } from "./DepthMedia";
import { LinkButton } from "./LinkButton";
import site from "./Site.module.css";
import styles from "./Views.module.css";
type Props = { title: ReactNode; description: string; image: string; alt: string; cta?: string; href?: string; compact?: boolean; cutout?: boolean; audience?: string };
export function PageHero({ title, description, image, alt, cta, href, compact = false, cutout = false, audience }: Props) {
  return <section className={`${styles.hero} ${compact ? styles.compactHero : ""}`} aria-labelledby="page-title">
    <div className={`${site.container} ${styles.heroGrid}`}>
      <div className={`${styles.heroCopy} ${audience ? styles.withAudience : ""}`}>
        {audience ? <span className={styles.heroAudience}>{audience}</span> : null}
        <h1 id="page-title">{title}</h1><p>{description}</p>
        {cta && href ? <LinkButton href={href} arrow>{cta}</LinkButton> : null}
        {audience ? null : <div className={styles.values}><span />Visión · Estilo · Bienestar</div>}
      </div>
      <DepthMedia className={`${styles.heroMedia} ${cutout ? styles.heroCutout : ""}`} intensity={3}>
        <Image className={styles.heroImage} src={image} alt={alt} fill preload sizes="(min-width: 900px) 58vw, 100vw" quality={90} />
      </DepthMedia>
    </div>
  </section>;
}
