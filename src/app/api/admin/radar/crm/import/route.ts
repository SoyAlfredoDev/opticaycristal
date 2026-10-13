import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { apiFailure, hasRadarAccess, readRadarBody, RadarApiError } from "@/lib/radar/api";
import { crmAction } from "@/lib/radar/crm-store";

export const runtime = "nodejs";

type ImportContact = {
  prospectId?: unknown;
  email?: unknown;
  name?: unknown;
  role?: unknown;
};

export async function POST(request: Request) {
  try {
    if (!(await hasRadarAccess(request, "manage")))
      return Response.json({ error: "No autorizado." }, { status: 401 });
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin && origin !== process.env.RADAR_PUBLIC_URL?.replace(/\/$/, ""))
      throw new RadarApiError("Origen no autorizado.", 403);
    const body = await readRadarBody(request, 1_000_000);
    const contacts = (body as { contacts?: unknown })?.contacts;
    if (!Array.isArray(contacts) || contacts.length < 1 || contacts.length > 500)
      throw new RadarApiError("Envía entre 1 y 500 contactos por lote.");

    const actor = (await getSession()) ? "admin" : "agent";
    const results = [];
    for (let offset = 0; offset < contacts.length; offset += 8) {
      const batch = await Promise.all(
      contacts.slice(offset, offset + 8).map(async (contact: ImportContact, index: number) => {
        try {
          if (!contact || typeof contact !== "object")
            throw new RadarApiError("Fila de contacto inválida.");
          const result = await crmAction(
            {
              action: "contact",
              id: randomUUID(),
              prospectId: contact.prospectId,
              email: contact.email,
              name: contact.name,
              role: contact.role,
            },
            actor,
          );
          return { row: offset + index + 1, ok: true, ...result };
        } catch (error) {
          return {
            row: offset + index + 1,
            ok: false,
            error: error instanceof Error ? error.message : "No se pudo guardar.",
          };
        }
      }),
    );
      results.push(...batch);
    }
    const imported = results.filter((result) => result.ok).length;
    return Response.json({ imported, failed: results.length - imported, results });
  } catch (error) {
    const failure = apiFailure(error);
    return Response.json(failure.body, { status: failure.status });
  }
}
