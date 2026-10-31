import { SiteFooter } from "@/components/site/SiteFooter";
import { editorialFont } from "./editorial-font";
import styles from "./EditorialHome.module.css";

export function HomeFooter() {
  return <div className={`${styles.scope} ${styles.footer} ${editorialFont.variable}`}><SiteFooter /></div>;
}
