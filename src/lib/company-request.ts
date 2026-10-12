import { CHILE_REGIONES, EMPTY_JORNADA_FORM, validateContacto, validateConfirmacion, type JornadaFormData } from "./jornada-form";
import { CONVENIO, isConvenioInterest, type ConvenioInterest } from "./convenios";
export type RequestKind = "jornada" | "convenio";
export type RequestDetails = { rutEmpresa?: string; trabajadores?: number; comuna?: string; direccion?: string; fechaTentativa?: string; comentarios?: string; modalidadConvenio?: ConvenioInterest };
export type CompanyRequest = JornadaFormData & { origen: RequestKind; detalles?: RequestDetails };
export type CompanyErrors = Partial<Record<keyof JornadaFormData | keyof RequestDetails, string>>;
export function emptyCompanyRequest(origen: RequestKind): CompanyRequest { return { ...EMPTY_JORNADA_FORM, origen, detalles: {} }; }
export function validRut(value: string): boolean {
  const normalized = value.replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return false;
  const digits = normalized.slice(0, -1); let sum = 0; let factor = 2;
  for (let i = digits.length - 1; i >= 0; i--) { sum += Number(digits[i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const result = 11 - sum % 11;
  return normalized.at(-1) === (result === 11 ? "0" : result === 10 ? "K" : String(result));
}
export function validateCompanyRequest(data: CompanyRequest): CompanyErrors {
  const errors: CompanyErrors = { ...validateContacto(data), ...validateConfirmacion(data) };
  if (data.empresa.trim().length < 2) errors.empresa = "Ingresa el nombre de la empresa.";
  if (!CHILE_REGIONES.includes(data.region as typeof CHILE_REGIONES[number])) errors.region = "Selecciona una región válida.";
  if (data.origen === "jornada" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.mesEstimado)) errors.mesEstimado = "Selecciona el mes estimado del operativo.";
  const details = data.detalles ?? {};
  if (data.origen === "convenio" && (!Number.isInteger(details.trabajadores) || (details.trabajadores ?? 0) < CONVENIO.minWorkers)) errors.trabajadores = "Los convenios son para empresas con más de 10 trabajadores.";
  if (details.modalidadConvenio !== undefined && !isConvenioInterest(details.modalidadConvenio)) errors.modalidadConvenio = "Selecciona una opción de convenio válida.";
  if (details.trabajadores !== undefined && (!Number.isInteger(details.trabajadores) || details.trabajadores < 1 || details.trabajadores > 1000000)) errors.trabajadores = "Ingresa un número válido de trabajadores o participantes.";
  if (data.detalles && !details.comuna?.trim()) errors.comuna = "Ingresa la comuna.";
  if (details.rutEmpresa && !validRut(details.rutEmpresa)) errors.rutEmpresa = "Ingresa un RUT de empresa válido.";
  if (details.fechaTentativa) {
    const date = new Date(`${details.fechaTentativa}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(details.fechaTentativa) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== details.fechaTentativa) errors.fechaTentativa = "Ingresa una fecha válida.";
    else if (data.mesEstimado && !details.fechaTentativa.startsWith(data.mesEstimado)) errors.fechaTentativa = "La fecha tentativa debe corresponder al mes estimado.";
  }
  return errors;
}
export async function submitCompanyRequest(data: CompanyRequest, sitioWeb: string) {
  const response = await fetch("/api/solicitudes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, sitioWeb }) });
  if (!response.ok) {
    let message = "No pudimos registrar la solicitud. Inténtalo nuevamente.";
    try { const body: unknown = await response.json(); if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error; } catch { /* Non-JSON responses use the safe fallback. */ }
    throw new Error(message);
  }
}
