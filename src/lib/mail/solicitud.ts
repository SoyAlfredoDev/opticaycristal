import "server-only";

import { correoCliente, correoInterno } from "@/lib/mail/templates";
import { enviarConResend, resendConfigured } from "@/lib/mail/resend";
import { correoDestino } from "@/lib/solicitudes/store";
import { CONTACTO_EMAIL, type CorreoEstado, type Solicitud } from "@/lib/solicitudes/types";

export type ResultadoCorreo = {
  estado: CorreoEstado;
  detalle: string | null;
};

export type ResultadoSolicitudCorreo = {
  interno: ResultadoCorreo;
  cliente: ResultadoCorreo;
};

function pendiente(detalle: string): ResultadoCorreo {
  return { estado: "pendiente", detalle };
}

function desdeEnvio(envio: { ok: boolean; error: string | null }, destino: string): ResultadoCorreo {
  if (envio.ok) return { estado: "enviado", detalle: null };
  return { estado: "error", detalle: envio.error ?? `No se pudo enviar el correo a ${destino}.` };
}

export async function sendSolicitudCorreos(solicitud: Solicitud): Promise<ResultadoSolicitudCorreo> {
  if (!resendConfigured()) {
    return {
      interno: pendiente(`Resend no está configurado. El aviso a ${CONTACTO_EMAIL} no se envió.`),
      cliente: pendiente("Resend no está configurado. La confirmación al cliente no se envió."),
    };
  }

  const interno = correoInterno(solicitud);
  const cliente = correoCliente(solicitud);
  const destinoInterno = correoDestino();

  const [envioInterno, envioCliente] = await Promise.all([
    enviarConResend({ ...interno, to: destinoInterno }),
    enviarConResend({ ...cliente, to: solicitud.correo }),
  ]);

  return {
    interno: desdeEnvio(envioInterno, destinoInterno),
    cliente: desdeEnvio(envioCliente, solicitud.correo),
  };
}
