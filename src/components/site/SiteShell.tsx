import type { ReactNode } from "react";
import { displayFont, bodyFont } from "./fonts";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import styles from "./Site.module.css";
export function SiteShell({ active, children }: { active: string; children: ReactNode }) {
  return <div className={`${styles.home} ${displayFont.variable} ${bodyFont.variable}`}>
    <SiteHeader active={active} /><main id="contenido-principal">{children}</main><SiteFooter showContact={false} />
  </div>;
}
