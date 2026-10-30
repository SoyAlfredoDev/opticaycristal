import type { Metadata } from "next";
import { bodyFont, displayFont } from "@/components/site/fonts";
import styles from "@/components/clients/ClientSpace.module.css";
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#007f5f" };
export const metadata: Metadata = { title: "Mi espacio", robots: { index: false, follow: false }, manifest: "/mi-cuenta/manifest.webmanifest", referrer: "no-referrer", appleWebApp: { capable: true, title: "Mi Óptica", statusBarStyle: "default" } };
export default function ClientLayout({ children }: { children: React.ReactNode }) { return <div className={`${styles.space} ${bodyFont.variable} ${displayFont.variable}`}>{children}</div>; }
