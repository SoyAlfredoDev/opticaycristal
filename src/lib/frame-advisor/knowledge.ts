import "server-only";
import type { Profile, Shape, Style } from "./shared";

export const knowledgeVersion = "monturas-2026-11-v1";

const frameGuide: Record<Shape, string> = {
  cuadrada: "Esquinas y lados definidos. Da un contraste visible frente a un contorno suave; una esquina redondeada reduce la dureza del efecto.",
  rectangular: "Línea horizontal marcada. Puede aportar estructura o un efecto sobrio; evita presentar una montura estrecha como ajuste garantizado.",
  redonda: "Curvas continuas. Puede suavizar visualmente una mandíbula marcada o aportar un estilo retro; un borde fino resulta más discreto.",
  ovalada: "Curvas más abiertas en horizontal. Alternativa suave y de poco protagonismo; en un rostro alargado una montura demasiado baja puede acentuar la verticalidad.",
  "cat-eye": "Extremos superiores elevados. Marca la zona de los ojos y puede aportar un acento expresivo; hay versiones sutiles y de ángulo pronunciado.",
  aviador: "Lentes de silueta descendente y puente doble. Puede dar un estilo clásico y más presencia vertical; conviene comprobar que no toque las mejillas al sonreír.",
  panto: "Parte alta algo plana con base redondeada. Combina una línea superior definida con una silueta suave, útil como punto intermedio entre angular y redonda.",
  browline: "Borde superior con mayor peso visual. Resalta la línea de las cejas y aporta un acabado retro; un borde inferior ligero equilibra el contraste.",
};

const contourGuide: Record<Profile, string> = {
  suave: "Contraste posible: cuadrada o rectangular. Si prefiere continuidad, panto u ovalada. Describe el efecto visual, sin corregir el rostro.",
  definido: "Contraste posible: redonda, ovalada o panto. Si prefiere reforzar líneas angulares, rectangular con un acabado de poco contraste.",
  alargado: "Formas con más altura visual como cuadrada, panto o aviador pueden aportar presencia. Evita inferir talla a partir del encuadre.",
  equilibrado: "Prioriza las preferencias del cliente. Compara una forma angular con otra de curvas y un acento diferente.",
  "sin-foto": "Basa la selección en las preferencias indicadas y ofrece tres efectos visuales distintos. No supongas ninguna proporción facial.",
};

const preferenceGuide: Record<Style, string> = {
  discreto: "Da prioridad a líneas delgadas y colores de bajo contraste como transparente, gris, plata o carey suave.",
  clásico: "Combina una silueta reconocible con colores como negro, carey, vino oscuro o dorado. Incluye variedad entre opciones.",
  llamativo: "Explora volumen visual, formas distintivas y colores como vino, verde, azul o ámbar. Incluye una alternativa de intensidad moderada.",
};

const colorGuide = [
  "Negro y azul profundo enfatizan el contorno. Gris y plata dan un efecto más tenue si el acabado es fino.",
  "Carey combina marrones y ámbar y aporta textura. Ámbar y dorado dan un acento cálido. Transparente reduce el contraste.",
  "Vino, verde y azul son opciones de acento. Presenta el color como preferencia visual: la luz, el material y la pantalla cambian su apariencia.",
  "Usa ejemplos de color para comparar. Evita adivinar origen, género, edad, salud o personalidad de la persona.",
];

export function adviceReference(profile: Profile, style: Style) {
  return {
    version: knowledgeVersion,
    guides: { frames: frameGuide, proportions: contourGuide[profile], preferences: preferenceGuide[style], color: colorGuide },
    fitting: [
      "Las proporciones de una selfie son aproximadas y sirven para conversar sobre estilo.",
      "Si la persona prueba la montura en el local, observar el apoyo en puente y sienes, las cejas y que el aro no roce mejillas al sonreír.",
      "El ajuste físico, receta, distancia pupilar, altura de montaje y elección del cristal corresponden a una revisión profesional aparte.",
    ],
    sources: [
      { type: "preferencia", url: "https://graphicsinterface.org/wp-content/uploads/gi2016-23.pdf", summary: "Estudio de recomendación de formas de monturas con preferencias de participantes, sin reglas universales." },
      { type: "preferencia", url: "https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002973010", summary: "Estudio de preferencias por forma de rostro en una muestra de universitarios; resultados limitados a su población." },
      { type: "ajuste", url: "https://pubmed.ncbi.nlm.nih.gov/35000565/", summary: "Las mediciones de montaje para progresivos varían entre dispositivos y requieren un protocolo apropiado." },
    ],
  };
}
