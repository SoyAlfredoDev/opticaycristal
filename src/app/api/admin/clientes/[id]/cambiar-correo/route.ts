import { customerAdminSession } from "@/lib/clients/admin";
import { confirmCustomerEmailChange, CustomerEditError, sendCustomerEmailChange } from "@/lib/clients/customer-edit";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { AdminCreateError } from "@/lib/clients/staff-customer-limits";
import { StaffEmailCodeError } from "@/lib/clients/staff-email-verification";
import { whatsappRequestIp } from "@/lib/integrations/whatsapp-verification-limits";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const staff = await customerAdminSession(true);
    if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
    if (staff.role === "seller") return privateJson({ error: "Solo un administrador puede cambiar el correo de ingreso." }, 403);
    if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);

    let body: Record<string, unknown>;
    try {
        const raw = await readClientBody(request, 1024);
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
        body = raw as Record<string, unknown>;
    } catch {
        return privateJson({ error: "Solicitud no válida." }, 400);
    }

    const { id } = await params;
    try {
        if (body.action === "send" && Object.keys(body).every(key => ["action", "email"].includes(key)))
            return privateJson(await sendCustomerEmailChange(id, staff.u, whatsappRequestIp(request), body.email));
        if (body.action === "confirm" && Object.keys(body).every(key => ["action", "email", "requestId", "code"].includes(key)))
            return privateJson(await confirmCustomerEmailChange(id, staff.u, body));
        return privateJson({ error: "Solicitud no válida." }, 400);
    } catch (error) {
        if (error instanceof CustomerEditError || error instanceof StaffEmailCodeError || error instanceof AdminCreateError)
            return privateJson({ error: error.message }, error.status);
        return privateJson({ error: "No pudimos completar el cambio de correo." }, 503);
    }
}
