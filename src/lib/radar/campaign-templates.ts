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
    subject: "Una jornada visual para tu equipo",
    preheader: "Llevamos nuestro equipo de profesionales a su empresa. Soliciten los precios y las condiciones.",
    headline: "Ver bien. Sentirse bien.",
    eyebrow: "Regala a tu equipo un chequeo visual 100% gratuito.", cta: "Sí, quiero más información",
    body: "Hola, equipo de {{empresa}}:\n\nSomos **Óptica & Cristal**. Queremos ayudarles a acercar el cuidado de la salud visual a sus trabajadores, llevando nuestro equipo de profesionales **directamente a las instalaciones de su empresa**.\n\nLa jornada contempla:\n\n- **Chequeo visual gratuito** para sus trabajadores.\n- **Descuentos de hasta un 30%** en lentes, cristales y accesorios, según las condiciones de la propuesta.\n- Variedad de modelos y alternativas de cristales para distintas necesidades.\n- **Financiamiento opcional** mediante la empresa, con descuento por nómina, **previo acuerdo y contrato**.\n\n**¿Les gustaría recibir más información?**\n\nRespondan a este correo con **«Sí, quiero más información»** y les enviaremos el listado oficial de precios y un PDF con los servicios, requisitos y condiciones para organizar una jornada.",
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
