"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieOptions, getSession } from "@/lib/auth";
import { sendSolicitudCorreos } from "@/lib/mail/solicitud";
import { getSolicitud, updateCorreoEstado } from "@/lib/solicitudes/store";

export async function logoutAction() {
  const jar = await cookies();
  if(jar.has("oc_staff.session_token")||jar.has("__Secure-oc_staff.session_token")) {
    const {staffAuth}=await import("@/lib/staff/auth");
    await staffAuth().api.signOut({headers:await headers()});
    jar.set("oc_staff.session_token","",adminCookieOptions(0));
    jar.set("__Secure-oc_staff.session_token","",{...adminCookieOptions(0),secure:true});
  }
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
    correoId: correos.interno.id,
    correoClienteId: correos.cliente.id,
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
