export const CONVENIO = { discountPercent: 20, maxInstallments: 3, minWorkers: 5 } as const;

export const convenioInterests = {
  descuento: "Descuento y consulta visual gratuita",
  financiamiento: "Descuento y financiamiento por nómina",
  asesoria: "Asesoría para elegir el beneficio",
} as const;

export type ConvenioInterest = keyof typeof convenioInterests;

export function isConvenioInterest(value: unknown): value is ConvenioInterest {
  return typeof value === "string" && Object.hasOwn(convenioInterests, value);
}

export const convenioSteps = [
  { title: "Cuéntanos sobre tu equipo", description: "Completa el formulario con tus datos y los de tu empresa. Los convenios son para equipos de 5 o más trabajadores." },
  { title: "Te explicamos las condiciones", description: "Resolvemos tus dudas y coordinamos el registro para que trabajadores y familiares puedan utilizar el beneficio." },
  { title: "Elige si sumas financiamiento", description: "Las cuotas por nómina son opcionales. Requieren un acuerdo y un contrato con las condiciones de pago." },
] as const;

export const convenioFaqs = [
  { question: "¿Qué es un convenio óptico?", answer: "Es un acuerdo con tu empresa para que sus trabajadores y familiares accedan a un beneficio: 20% de descuento en compras online y en nuestra óptica, y consulta visual gratuita. Coordinamos contigo el registro y cómo utilizarlo." },
  { question: "¿En qué se diferencia de una jornada?", answer: "El convenio es un beneficio que tu equipo utiliza online y en nuestra óptica. En una jornada, nuestro equipo visita las instalaciones de la empresa en una fecha acordada para realizar la atención visual." },
  { question: "¿Quiénes pueden utilizar el descuento?", answer: "Los trabajadores de la empresa registrada y sus familiares. Reciben 20% de descuento en todas sus compras." },
  { question: "¿Se puede comprar online y presencialmente?", answer: "Sí. El 20% aplica en la web y en la óptica. Al registrar tu empresa, coordinamos cómo identificar a tus trabajadores y sus familiares en cada canal." },
  { question: "¿El convenio incluye consulta visual?", answer: "Sí. La consulta visual gratuita es parte del beneficio para trabajadores y familiares. La coordinamos con tu empresa." },
  { question: "¿Es necesario contratar financiamiento para obtener el descuento?", answer: "Puedes registrar tu empresa para el descuento y la consulta visual sin sumar financiamiento. Las cuotas por nómina son opcionales y requieren un acuerdo y un contrato entre tu empresa y Óptica & Cristal." },
  { question: "¿Quién paga a Óptica & Cristal cuando se usa financiamiento?", answer: "Tu empresa paga a Óptica & Cristal, según el contrato. El trabajador paga su compra en hasta tres cuotas, que la empresa descuenta de su nómina." },
  { question: "¿Qué ocurre después de enviar el formulario?", answer: "Recibimos la solicitud y contactamos a la persona de tu empresa. Enviar el formulario no firma un contrato ni activa las cuotas por nómina." },
] as const;
