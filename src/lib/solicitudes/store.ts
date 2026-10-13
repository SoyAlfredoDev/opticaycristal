import "server-only";

import { fileStore } from "@/lib/solicitudes/file-store";
import { mysqlStore } from "@/lib/solicitudes/mysql-store";
import { neonStore } from "@/lib/solicitudes/neon-store";
import { websiteDatabaseConfigured } from "@/lib/website-db";
import { resendConfigured } from "@/lib/mail/resend";
import { CONTACTO_EMAIL, type ActualizacionCorreo, type NuevaSolicitud } from "@/lib/solicitudes/types";

export function dbConfigured() {
  return Boolean(process.env.DB_HOST?.trim() && process.env.DB_USER?.trim() && process.env.DB_NAME?.trim());
}

export function correoConfigurado() {
  return resendConfigured();
}

export function correoDestino() {
  return CONTACTO_EMAIL;
}

function store() {
  if (websiteDatabaseConfigured()) return neonStore;
  if (!dbConfigured() && process.env.VERCEL) throw new Error("Configura DATABASE_URL para almacenar solicitudes en Vercel.");
  return dbConfigured() ? mysqlStore : fileStore;
}

export function infraStatus() {
  const persistencia = websiteDatabaseConfigured() ? "neon" : dbConfigured() ? "mysql" : "archivo";
  return {
    persistencia,
    resend: correoConfigurado(),
    destino: correoDestino(),
    archivoEnProduccion: persistencia === "archivo" && process.env.NODE_ENV === "production",
  } as const;
}

export function listSolicitudes() {
  return store().list();
}

export function getSolicitud(id: string) {
  return store().get(id);
}

export function createSolicitud(input: NuevaSolicitud) {
  return store().create(input);
}

export function updateCorreoEstado(id: string, actualizacion: ActualizacionCorreo) {
  return store().updateCorreo(id, actualizacion);
}
