import { VisitSection } from "@/components/site/VisitSection";
import { editorialFont } from "./editorial-font";
import styles from "./EditorialHome.module.css";

export function HomeVisitSection() {
  return <div className={`${styles.scope} ${styles.visit} ${editorialFont.variable}`}><VisitSection /></div>;
}
