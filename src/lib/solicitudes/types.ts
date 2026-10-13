import type { RequestDetails } from "@/lib/company-request";
export const CONTACTO_EMAIL = "contacto@opticaycristal.cl";

export const ORIGENES = ["jornada", "convenio"] as const;

export type OrigenSolicitud = (typeof ORIGENES)[number];

export type CorreoEstado = "enviado" | "error" | "pendiente";

export type Solicitud = {
  id: string;
  origen: OrigenSolicitud;
  responsable: string;
  cargo: string;
  telefono: string;
  correo: string;
  empresa: string;
  region: string;
  mesEstimado: string;
  detalles?: RequestDetails;
  autorizacionDatos: boolean;
  correoDestino: string;
  correoEstado: CorreoEstado;
  correoDetalle: string | null;
  correoClienteEstado: CorreoEstado;
  correoClienteDetalle: string | null;
  correoId?: string | null;
  correoClienteId?: string | null;
  creadoEn: string;
};

export type NuevaSolicitud = Omit<
  Solicitud,
  "correoEstado" | "correoDetalle" | "correoClienteEstado" | "correoClienteDetalle"
> & {
  correoEstado?: CorreoEstado;
  correoDetalle?: string | null;
  correoClienteEstado?: CorreoEstado;
  correoClienteDetalle?: string | null;
};

export type ActualizacionCorreo = {
  correoEstado: CorreoEstado;
  correoDetalle: string | null;
  correoClienteEstado: CorreoEstado;
  correoClienteDetalle: string | null;
  correoId?: string | null;
  correoClienteId?: string | null;
};

export const ORIGEN_LABEL: Record<OrigenSolicitud, string> = {
  jornada: "Jornada oftalmológica",
  convenio: "Convenio para empresa",
};
