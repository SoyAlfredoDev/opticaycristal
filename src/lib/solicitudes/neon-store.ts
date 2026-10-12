import "server-only";
import { websiteStore } from "@/lib/website-db";
import type { ActualizacionCorreo, NuevaSolicitud, Solicitud } from "./types";

const records = websiteStore<Solicitud>("requests");
export const neonStore = {
  list: records.list,
  get: records.get,
  create(input: NuevaSolicitud) {
    return records.create({
      ...input,
      correoEstado: input.correoEstado ?? "pendiente",
      correoDetalle: input.correoDetalle ?? null,
      correoClienteEstado: input.correoClienteEstado ?? "pendiente",
      correoClienteDetalle: input.correoClienteDetalle ?? null,
    });
  },
  async updateCorreo(id: string, update: ActualizacionCorreo) {
    await records.update(id, update);
  },
};
