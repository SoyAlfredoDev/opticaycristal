import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { sendCustomerEmailCode, confirmCustomerEmailCode, StaffEmailCodeError } from "@/lib/clients/staff-email-verification";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { const staff = await customerAdminSession(); if (!staff)
    return privateJson({ error: "Acceso restringido." }, 401); if (!sameClientOrigin(request))
    return privateJson({ error: "Origen no permitido." }, 403); try {
    const raw = await readClientBody(request);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return privateJson({ error: "Solicitud no válida." }, 400);
    const body = raw as Record<string, unknown>, { id } = await params;
    if (body.action === "send")
        return privateJson(await sendCustomerEmailCode(id, staff.u));
    if (body.action === "confirm")
        return privateJson(await confirmCustomerEmailCode(id, body, staff.u));
    return privateJson({ error: "Acción no válida." }, 400);
}
catch (e) {
    return privateJson({ error: e instanceof StaffEmailCodeError ? e.message : "No pudimos completar la verificación. Inténtalo nuevamente." }, e instanceof StaffEmailCodeError ? e.status : 503);
} }
