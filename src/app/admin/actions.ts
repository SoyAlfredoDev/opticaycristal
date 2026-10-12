"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieOptions, getSession } from "@/lib/auth";
import { sendSolicitudCorreos } from "@/lib/mail/solicitud";
import { getSolicitud, updateCorreoEstado } from "@/lib/solicitudes/store";

export async function logoutAction() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  redirect("/admin/login");
}

export async function reenviarAvisoAction(id: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "La sesión expiró. Vuelve a entrar." };

  const solicitud = await getSolicitud(id);
  if (!solicitud) return { ok: false as const, error: "No encontramos esa solicitud." };

  const correos = await sendSolicitudCorreos(solicitud);
  await updateCorreoEstado(id, {
    correoEstado: correos.interno.estado,
    correoDetalle: correos.interno.detalle,
    correoClienteEstado: correos.cliente.estado,
    correoClienteDetalle: correos.cliente.detalle,
  });
  revalidatePath("/admin");

  const errores = [correos.interno.detalle, correos.cliente.detalle].filter(Boolean);
  if (correos.interno.estado !== "enviado" || correos.cliente.estado !== "enviado") {
    return {
      ok: false as const,
      error: errores.join(" ") || "No se pudieron enviar los correos.",
    };
  }

  return { ok: true as const, error: null };
}
