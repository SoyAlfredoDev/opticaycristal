import { Bodoni_Moda } from "next/font/google";

// One shared Bodoni loader for the public website. Private routes keep their own display font.
export const editorialFont = Bodoni_Moda({
  subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"],
  display: "swap", variable: "--oc-font-editorial",
});
