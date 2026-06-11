import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Solicitar Jornada Oftalmológica | Óptica y Cristal Chile",
  description:
    "Solicita una jornada oftalmológica para tu empresa. Chequeos visuales en terreno, sin costo para la organización.",
};

export default function JornadasPage() {
  redirect("/#contratar");
}
