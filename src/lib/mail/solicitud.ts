import "server-only";

import { correoCliente, correoInterno } from "@/lib/mail/templates";
import { enviarConResend, resendConfigured } from "@/lib/mail/resend";
import { CONTACTO_EMAIL, type CorreoEstado, type Solicitud } from "@/lib/solicitudes/types";

export type ResultadoCorreo = {
  estado: CorreoEstado;
  detalle: string | null;
  id: string | null;
};

export type ResultadoSolicitudCorreo = {
  interno: ResultadoCorreo;
  cliente: ResultadoCorreo;
};

function pendiente(detalle: string): ResultadoCorreo {
  return { estado: "pendiente", detalle, id: null };
}

function desdeEnvio(envio: { ok: boolean; id: string | null; error: string | null }, destino: string): ResultadoCorreo {
  if (envio.ok) return { estado: "enviado", detalle: null, id: envio.id };
  return { estado: "error", detalle: envio.error ?? `No se pudo enviar el correo a ${destino}.`, id: null };
}

export async function sendSolicitudCorreos(solicitud: Solicitud): Promise<ResultadoSolicitudCorreo> {
  if (!resendConfigured()) {
    return {
      interno: solicitud.correoEstado === "enviado" ? { estado: "enviado", detalle: null, id: solicitud.correoId ?? null } : pendiente(`Resend no está configurado. El aviso a ${CONTACTO_EMAIL} no se envió.`),
      cliente: solicitud.correoClienteEstado === "enviado" ? { estado: "enviado", detalle: null, id: solicitud.correoClienteId ?? null } : pendiente("Resend no está configurado. La confirmación al cliente no se envió."),
    };
  }

  const interno = correoInterno(solicitud);
  const cliente = correoCliente(solicitud);
  const destinoInterno = CONTACTO_EMAIL;
  const tags = [{ name: "request_id", value: solicitud.id }, { name: "request_kind", value: solicitud.origen }];

  const [envioInterno, envioCliente] = await Promise.all([
    solicitud.correoEstado === "enviado"
      ? Promise.resolve({ ok: true, id: solicitud.correoId ?? null, error: null })
      : enviarConResend({ ...interno, to: destinoInterno, idempotencyKey: `request-${solicitud.id}-internal`, tags }),
    solicitud.correoClienteEstado === "enviado"
      ? Promise.resolve({ ok: true, id: solicitud.correoClienteId ?? null, error: null })
      : enviarConResend({ ...cliente, to: solicitud.correo, idempotencyKey: `request-${solicitud.id}-client`, tags }),
  ]);

  return {
    interno: desdeEnvio(envioInterno, destinoInterno),
    cliente: desdeEnvio(envioCliente, solicitud.correo),
  };
}
