import { customerAdminSession } from "@/lib/clients/admin";
import { AdminCreateError, createStaffCustomer, limitStaffCustomerAction, sendSalesRegistrationCode } from "@/lib/clients/admin-create";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { StaffEmailCodeError } from "@/lib/clients/staff-email-verification";
import { whatsappRequestIp } from "@/lib/integrations/whatsapp-verification-limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const staff = await customerAdminSession(true);
    if (!staff) return privateJson({ error: "Acceso restringido." }, 401);
    if (!sameClientOrigin(request)) return privateJson({ error: "Origen no permitido." }, 403);

    let body: Record<string, unknown>;
    try {
        const raw = await readClientBody(request, 4096);
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
        body = raw as Record<string, unknown>;
    } catch {
        return privateJson({ error: "Datos no válidos." }, 400);
    }

    const { action, requestId, code, ...contact } = body;
    const ip = whatsappRequestIp(request);
    try {
        if (action === "send" && requestId === undefined && code === undefined) {
            return privateJson(await sendSalesRegistrationCode(contact, staff.u, ip));
        }
        if (action === "create" && typeof requestId === "string" && typeof code === "string") {
            await limitStaffCustomerAction(staff.u, "sale-register-confirm", 60);
            await limitStaffCustomerAction(ip, "sale-register-confirm-ip", 120);
            return privateJson(await createStaffCustomer(contact, staff.u, { requestId, code }));
        }
        return privateJson({ error: "Solicitud no válida." }, 400);
    } catch (error) {
        if (error instanceof AdminCreateError || error instanceof StaffEmailCodeError)
            return privateJson({ error: error.message }, error.status);
        return privateJson({ error: "No pudimos completar el registro del cliente." }, 503);
    }
}
