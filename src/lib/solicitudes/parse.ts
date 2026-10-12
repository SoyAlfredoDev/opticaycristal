import { validateCompanyRequest, type RequestDetails } from "@/lib/company-request";
import { isConvenioInterest } from "@/lib/convenios";
import {
  CHILE_REGIONES,
  isValidChileanPhone,
  isValidEmail,
  type JornadaFormData,
} from "@/lib/jornada-form";
import { ORIGENES, type OrigenSolicitud } from "@/lib/solicitudes/types";

const LIMITS = {
  responsable: 160,
  cargo: 160,
  telefono: 40,
  correo: 190,
  empresa: 190,
} as const;

export type ParsedSolicitud =
  | { ok: true; spam: true }
  | { ok: true; spam: false; origen: OrigenSolicitud; data: JornadaFormData & { detalles?: RequestDetails } }
  | { ok: false; error: string };

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isReasonableMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  const target = new Date(year, month - 1, 1);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 14, 1);
  return target >= start && target < end;
}

export function parseSolicitudBody(body: unknown): ParsedSolicitud {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "La solicitud no tiene un formato válido." };

  const honeypot = typeof record.sitioWeb === "string" ? record.sitioWeb.trim() : "";
  if (honeypot) return { ok: true, spam: true };

  const origen = record.origen;
  if (typeof origen !== "string" || !ORIGENES.includes(origen as OrigenSolicitud)) {
    return { ok: false, error: "No reconocemos el origen de esta solicitud." };
  }

  const data: JornadaFormData & { detalles?: RequestDetails } = {
    responsable: text(record.responsable, LIMITS.responsable),
    cargo: text(record.cargo, LIMITS.cargo),
    telefono: text(record.telefono, LIMITS.telefono),
    correo: text(record.correo, LIMITS.correo).toLowerCase(),
    empresa: text(record.empresa, LIMITS.empresa),
    region: text(record.region, 120),
    mesEstimado: text(record.mesEstimado, 7),
    autorizacionDatos: record.autorizacionDatos === true,
  };

  if (record.detalles !== undefined) {
    const details = asRecord(record.detalles);
    if (!details) return { ok: false, error: "Los datos de coordinación no tienen un formato válido." };
    if (details.modalidadConvenio !== undefined && !isConvenioInterest(details.modalidadConvenio)) return { ok: false, error: "Selecciona una opción de convenio válida." };
    data.detalles = {
      rutEmpresa: text(details.rutEmpresa, 16),
      trabajadores: details.trabajadores === undefined ? undefined : typeof details.trabajadores === "number" ? details.trabajadores : Number.NaN,
      comuna: text(details.comuna, 120), direccion: text(details.direccion, 250),
      fechaTentativa: text(details.fechaTentativa, 10), comentarios: text(details.comentarios, 2000),
      ...(origen === "convenio" && isConvenioInterest(details.modalidadConvenio) ? { modalidadConvenio: details.modalidadConvenio } : {}),
    };
  }
  const errors = validateCompanyRequest({ ...data, origen: origen as OrigenSolicitud });

  if (!CHILE_REGIONES.includes(data.region as (typeof CHILE_REGIONES)[number])) {
    errors.region = "Selecciona una región válida.";
  }
  if (origen === "jornada" && !isReasonableMonth(data.mesEstimado)) {
    errors.mesEstimado = "Selecciona un mes estimado válido.";
  }
  if (data.telefono && !isValidChileanPhone(data.telefono)) {
    errors.telefono = "Ingresa un teléfono chileno válido.";
  }
  if (data.correo && !isValidEmail(data.correo)) {
    errors.correo = "Ingresa un correo electrónico válido.";
  }
  if (/[\r\n]/.test(data.correo)) {
    errors.correo = "Ingresa un correo electrónico válido.";
  }

  const firstError = Object.values(errors).find(Boolean);
  if (firstError) return { ok: false, error: firstError };

  return { ok: true, spam: false, origen: origen as OrigenSolicitud, data };
}
