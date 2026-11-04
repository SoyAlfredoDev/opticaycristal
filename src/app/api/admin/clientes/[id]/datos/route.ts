import { customerAdminSession } from "@/lib/clients/admin";
import { privateJson, readClientBody, sameClientOrigin } from "@/lib/clients/http";
import { CustomerEditError, editableCustomer, updateCustomerDetails } from "@/lib/clients/customer-edit";
export const runtime = "nodejs";
function fail(error: unknown) { return privateJson({ error: error instanceof CustomerEditError ? error.message : "No pudimos actualizar el cliente. Inténtalo nuevamente." }, error instanceof CustomerEditError ? error.status : 503); }
export async function GET(_r: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { if (!await customerAdminSession(true))
    return privateJson({ error: "Acceso restringido." }, 401); try {
    return privateJson({ customer: await editableCustomer((await params).id) });
}
catch (e) {
    return fail(e);
} }
export async function POST(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { const staff = await customerAdminSession(true); if (!staff)
    return privateJson({ error: "Acceso restringido." }, 401); if (!sameClientOrigin(request))
    return privateJson({ error: "Origen no permitido." }, 403); let raw; try {
    raw = await readClientBody(request);
}
catch {
    return privateJson({ error: "Revisa los datos." }, 400);
} try {
    return privateJson(await updateCustomerDetails((await params).id, raw, staff.u));
}
catch (e) {
    return fail(e);
} }
