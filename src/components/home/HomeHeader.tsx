import { SiteHeader } from "@/components/site/SiteHeader";
import { MonthlyNotice } from "./MonthlyNotice";
import styles from "./MonthlyNotice.module.css";

export function HomeHeader() {
  return <SiteHeader announcement={<MonthlyNotice />} className={styles.homeHeader} fitViewport />;
}
