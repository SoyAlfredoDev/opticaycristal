import { redirect } from "next/navigation";
import SolicitudesPanel from "@/components/admin/SolicitudesPanel";
import { getSession } from "@/lib/auth";
import { infraStatus, listSolicitudes } from "@/lib/solicitudes/store";
import type { Solicitud } from "@/lib/solicitudes/types";

export const dynamic = "force-dynamic";

export default async function AdminSolicitudesPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const infra = infraStatus();
  let solicitudes: Solicitud[] = [];
  let errorCarga: string | null = null;

  try {
    solicitudes = await listSolicitudes();
  } catch (error) {
    console.error("No se pudo leer el registro de solicitudes", error);
    errorCarga = "No se pudo leer el registro. Revisa la conexión a la base de datos.";
  }

  return <SolicitudesPanel solicitudes={solicitudes} infra={infra} errorCarga={errorCarga} />;
}
