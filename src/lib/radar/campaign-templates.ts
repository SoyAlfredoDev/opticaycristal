import { CONVENIO } from "@/lib/convenios";

export const campaignTemplates = [
  {
    id: "convenio", name: "Convenio · beneficio para el equipo", objective: "convenio",
    subject: "Un beneficio óptico para tu equipo",
    preheader: "Descuento, consulta visual y acompañamiento para trabajadores y familiares.",
    headline: "Un beneficio que tu equipo puede ver.",
    eyebrow: "Convenios para empresas", cta: "Solicitar información del convenio",
    body: `Hola, equipo de {{empresa}}:\n\nQueremos invitarles a conocer el convenio de Óptica & Cristal: ${CONVENIO.discountPercent}% de descuento en compras online y en nuestra óptica, junto con consulta visual gratuita para trabajadores y familiares.\n\nSi desean incorporar financiamiento, podemos acordar hasta ${CONVENIO.maxInstallments} cuotas por nómina. Esta modalidad requiere un contrato con la empresa: la empresa paga a la óptica y descuenta las cuotas al trabajador.\n\nCuéntennos qué beneficio buscan. Les orientaremos y revisaremos las condiciones para su equipo, sin compromiso de contratación.`,
    highlights: ["Beneficio para trabajadores y familiares", "Compra online y atención en la óptica", "Cuotas por nómina únicamente con contrato"],
  },
  {
    id: "jornada", name: "Jornada · atención en la empresa", objective: "jornada",
    subject: "Llevemos la atención visual a tu empresa",
    preheader: "Coordinemos una jornada en sus instalaciones para un equipo de más de 20 trabajadores.",
    headline: "Cuidar su mirada, cerca de su trabajo.",
    eyebrow: "Jornadas oftalmológicas", cta: "Consultar una jornada para mi empresa",
    body: "Hola, equipo de {{empresa}}:\n\nEn Óptica & Cristal coordinamos jornadas de atención visual en las instalaciones de empresas con más de 20 trabajadores. La idea es acercar el servicio al equipo y organizar la atención con una persona responsable de su empresa.\n\nPara preparar una propuesta, revisamos la cantidad de participantes, ubicación, espacios disponibles y fechas posibles. Los servicios, costos y condiciones se detallan antes de confirmar la jornada.\n\nSi les interesa, cuéntennos cuántas personas podrían participar. Nuestro equipo les contactará para evaluar la coordinación.",
    highlights: ["Atención en las instalaciones de la empresa", "Fecha y organización acordadas con su equipo", "Propuesta previa con servicios y condiciones"],
  },
  {
    id: "presentacion", name: "Presentación · dos formas de colaborar", objective: "ambas",
    subject: "Dos formas de cuidar la mirada de tu equipo",
    preheader: "Convenios ópticos o jornadas en la empresa: conversemos sobre lo que necesitan.",
    headline: "Conversemos sobre el bienestar de su equipo.",
    eyebrow: "Óptica & Cristal para empresas", cta: "Evaluar opciones para mi equipo",
    body: `Hola, equipo de {{empresa}}:\n\nQueremos presentarles dos formas de trabajar con Óptica & Cristal.\n\nConvenio óptico: ${CONVENIO.discountPercent}% de descuento online y en la óptica, más consulta visual gratuita para trabajadores y familiares. El financiamiento de hasta ${CONVENIO.maxInstallments} cuotas por nómina se acuerda mediante contrato con la empresa.\n\nJornada en la empresa: coordinamos atención visual en sus instalaciones para equipos de más de 20 trabajadores, con servicios, fecha y condiciones previamente acordados.\n\nCompártannos su necesidad y la dotación aproximada. Les ayudaremos a evaluar la alternativa adecuada; solicitar información no activa un convenio ni confirma una jornada.`,
    highlights: ["Convenio: beneficio continuo para su equipo", "Jornada: atención coordinada en la empresa", "Acompañamiento para elegir la modalidad"],
  },
] as const;

export type CampaignTemplateId = typeof campaignTemplates[number]["id"];
export function campaignTemplate(id: unknown) {
  return campaignTemplates.find(t => t.id === id) ?? campaignTemplates[0];
}
