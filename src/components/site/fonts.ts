import { Cormorant_Garamond, DM_Sans } from "next/font/google";
export const displayFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap", variable: "--oc-font-display" });
export const bodyFont = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--oc-font-body" });

// Public pages reuse the existing Bodoni loader; the private portal keeps displayFont.
export { editorialFont as publicDisplayFont } from "@/components/home/editorial-font";
