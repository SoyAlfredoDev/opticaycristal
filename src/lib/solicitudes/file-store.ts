import "server-only";

import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import type { ActualizacionCorreo, NuevaSolicitud, Solicitud } from "@/lib/solicitudes/types";

const filePath = path.join(process.cwd(), "data", "solicitudes.json");

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readAll(): Promise<Solicitud[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Solicitud[]).map((row) => ({
      ...row,
      correoClienteEstado: row.correoClienteEstado ?? "pendiente",
      correoClienteDetalle: row.correoClienteDetalle ?? null,
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeAll(rows: Solicitud[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(rows, null, 2), "utf8");
  try {
    await rename(tempPath, filePath);
  } catch {
    await rm(filePath, { force: true });
    await rename(tempPath, filePath);
  }
}

export const fileStore = {
  async list() {
    const rows = await readAll();
    return rows.sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  },

  async get(id: string) {
    const rows = await readAll();
    return rows.find((row) => row.id === id) ?? null;
  },

  async create(input: NuevaSolicitud) {
    return enqueue(async () => {
      const rows = await readAll();
      const solicitud: Solicitud = {
        ...input,
        correoEstado: input.correoEstado ?? "pendiente",
        correoDetalle: input.correoDetalle ?? null,
        correoClienteEstado: input.correoClienteEstado ?? "pendiente",
        correoClienteDetalle: input.correoClienteDetalle ?? null,
      };
      rows.push(solicitud);
      await writeAll(rows);
      return solicitud;
    });
  },

  async updateCorreo(id: string, actualizacion: ActualizacionCorreo) {
    return enqueue(async () => {
      const rows = await readAll();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return;
      rows[index] = { ...rows[index], ...actualizacion };
      await writeAll(rows);
    });
  },
};
