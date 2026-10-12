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
  { title: "Registra tu empresa", description: "Envíanos los datos de la empresa y de la persona de contacto. El convenio es para empresas con 5 o más trabajadores." },
  { title: "Activamos el beneficio", description: "Te contactamos para dejar el descuento y la consulta visual gratuita a tus trabajadores y sus familiares." },
  { title: "Si quieres, firmamos las cuotas", description: "Para ofrecer hasta tres cuotas por nómina, tu empresa firma un contrato con las condiciones de pago." },
] as const;

export const convenioFaqs = [
  { question: "¿El convenio es para personas?", answer: "No. El convenio se acuerda con la empresa. El beneficio lo usan sus trabajadores y los familiares de esos trabajadores." },
  { question: "¿Quiénes pueden utilizar el descuento?", answer: "Los trabajadores de la empresa registrada y sus familiares. Reciben 20% de descuento en todas sus compras." },
  { question: "¿Se puede comprar online y presencialmente?", answer: "Sí. El 20% aplica en la web y en la óptica. Al registrar tu empresa, coordinamos cómo identificar a tus trabajadores y sus familiares en cada canal." },
  { question: "¿El convenio incluye consulta visual?", answer: "Sí. La consulta visual gratuita es parte del beneficio para trabajadores y familiares. La coordinamos con tu empresa." },
  { question: "¿Es necesario contratar financiamiento para obtener el descuento?", answer: "No. El descuento queda disponible al registrar la empresa. Las cuotas por nómina son un beneficio extra y requieren un contrato entre tu empresa y Óptica & Cristal." },
  { question: "¿Quién paga a Óptica & Cristal cuando se usa financiamiento?", answer: "Tu empresa paga a Óptica & Cristal, según el contrato. El trabajador paga su compra en hasta tres cuotas, que la empresa descuenta de su nómina." },
  { question: "¿Qué ocurre después de enviar el formulario?", answer: "Recibimos la solicitud y contactamos a la persona de tu empresa. Enviar el formulario no firma un contrato ni activa las cuotas por nómina." },
] as const;
