import { FROM_ADDRESS, logoAttachment } from "@/lib/mail/templates";

export type EnvioCorreo = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
};

export type ResultadoEnvio = {
  ok: boolean;
  id: string | null;
  error: string | null;
};

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function enviar(message: EnvioCorreo): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, id: null, error: "Falta RESEND_API_KEY en el servidor." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    signal: AbortSignal.timeout(15000),
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: [logoAttachment()],
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return {
      ok: false,
      id: null,
      error: (body?.message || "No se pudo enviar el correo.").slice(0, 500),
    };
  }

  return { ok: true, id: body?.id ?? null, error: null };
}

export async function enviarConResend(message: EnvioCorreo): Promise<ResultadoEnvio> {
  try {
    return await enviar(message);
  } catch {
    return { ok: false, id: null, error: "No se pudo confirmar el envío. Revisa Resend antes de reenviar el mensaje." };
  }
}
