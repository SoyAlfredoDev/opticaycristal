export interface JornadaFormData {
  responsable: string;
  cargo: string;
  telefono: string;
  correo: string;
  empresa: string;
  region: string;
  mesEstimado: string;
  autorizacionDatos: boolean;
}

export type JornadaFormErrors = Partial<Record<keyof JornadaFormData, string>>;

export const EMPTY_JORNADA_FORM: JornadaFormData = {
  responsable: "",
  cargo: "",
  telefono: "",
  correo: "",
  empresa: "",
  region: "",
  mesEstimado: "",
  autorizacionDatos: false,
};

export const CHILE_REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "O’Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes y de la Antártica Chilena",
] as const;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function getMesOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES[date.getMonth()]} ${date.getFullYear()}`,
    });
  }

  return options;
}

export function getMesLabel(value: string) {
  const known = getMesOptions().find((option) => option.value === value)?.label;
  if (known) return known;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;
  return `${MESES[monthIndex]} ${match[1]}`;
}

export function isValidChileanPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("56")) {
    const rest = digits.slice(2);
    if (rest.startsWith("9") && rest.length === 9) return true;
    return rest.length >= 8 && rest.length <= 9;
  }

  if (digits.startsWith("9") && digits.length === 9) return true;
  return digits.length === 8;
}

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function validateContacto(data: JornadaFormData): JornadaFormErrors {
  const errors: JornadaFormErrors = {};

  if (data.responsable.trim().length < 2) {
    errors.responsable = "Ingresa el nombre de la persona responsable.";
  }
  if (data.cargo.trim().length < 2) {
    errors.cargo = "Ingresa el cargo.";
  }
  if (!data.telefono.trim()) {
    errors.telefono = "Ingresa un teléfono de contacto.";
  } else if (!isValidChileanPhone(data.telefono)) {
    errors.telefono = "Ingresa un teléfono chileno válido. Ej. +56 9 1234 5678";
  }
  if (!data.correo.trim()) {
    errors.correo = "Ingresa un correo electrónico.";
  } else if (!isValidEmail(data.correo)) {
    errors.correo = "Ingresa un correo electrónico válido. Ej. nombre@empresa.cl";
  }

  return errors;
}

export function validateEmpresa(data: JornadaFormData): JornadaFormErrors {
  const errors: JornadaFormErrors = {};

  if (data.empresa.trim().length < 2) {
    errors.empresa = "Ingresa el nombre de la empresa.";
  }
  if (!data.region) {
    errors.region = "Selecciona la región.";
  }
  if (!data.mesEstimado) {
    errors.mesEstimado = "Selecciona el mes estimado del operativo.";
  }

  return errors;
}

export function validateConfirmacion(data: JornadaFormData): JornadaFormErrors {
  const errors: JornadaFormErrors = {};

  if (!data.autorizacionDatos) {
    errors.autorizacionDatos =
      "Debes autorizar el tratamiento de tus datos personales para enviar la solicitud.";
  }

  return errors;
}

export async function submitJornadaRequest(data: JornadaFormData, sitioWeb = "") {
  const response = await fetch("/api/solicitudes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origen: "jornada", sitioWeb, ...data }),
  });

  if (!response.ok) {
    let message = "No pudimos enviar la solicitud. Inténtalo de nuevo.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // El servidor no devolvió JSON.
    }
    throw new Error(message);
  }
}
