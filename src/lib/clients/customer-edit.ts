import "server-only";
import { randomUUID } from "node:crypto";
import { clientPool, clientTable as t } from "./db";
import { clientFingerprint, protectClientValue, revealClientValue } from "./privacy";
import { parseCustomerContact } from "./validation";
import { CUSTOMER_OLD_EMAIL_HOLD_SECONDS } from "./email-token-policy";
export class CustomerEditError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
type Row = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    whatsappCipher: string;
    whatsappVerified: boolean;
    rutCipher: string;
};
export type EditableCustomer = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    whatsapp: string;
    whatsappVerified: boolean;
    rut: string;
    version: string;
};
function id(value: string) { if (!value || value.length > 120)
    throw new CustomerEditError("Cliente no válido."); return value; }
const fields = 'id,"firstName","lastName",email,"emailVerified","whatsappCipher","whatsappVerified","rutCipher"';
function decode(r: Row): EditableCustomer { const whatsapp = revealClientValue(r.whatsappCipher, "whatsapp"); return { id: r.id, firstName: r.firstName, lastName: r.lastName, email: r.email, emailVerified: r.emailVerified, whatsapp, whatsappVerified: r.whatsappVerified, rut: revealClientValue(r.rutCipher, "rut"), version: clientFingerprint(JSON.stringify([r.id, r.firstName, r.lastName, r.email, r.emailVerified, whatsapp, r.whatsappVerified]), "profile-version") }; }
export async function editableCustomer(customerId: string) { const r = await clientPool().query<Row>(`SELECT ${fields} FROM ${t("oc_client_user")} WHERE id=$1`, [id(customerId)]); if (!r.rows[0])
    throw new CustomerEditError("Cliente no encontrado.", 404); return decode(r.rows[0]); }
export async function updateCustomerDetails(customerId: string, raw: unknown, actor: string) {
    id(customerId);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new CustomerEditError("Revisa los datos.");
    const b = raw as Record<string, unknown>;
    if (Object.keys(b).some(k => !["firstName", "lastName", "email", "whatsapp", "expectedVersion"].includes(k)))
        throw new CustomerEditError("El RUT y los permisos de la cuenta no se pueden modificar desde esta vista.");
    let contact: ReturnType<typeof parseCustomerContact>;
    try {
        contact = parseCustomerContact(b);
    }
    catch (e) {
        throw new CustomerEditError(e instanceof Error ? e.message : "Revisa los datos.");
    }
    if (typeof b.expectedVersion !== "string" || !/^[a-f0-9]{64}$/.test(b.expectedVersion))
        throw new CustomerEditError("Vuelve a abrir la edición del cliente.");
    const db = await clientPool().connect();
    try {
        await db.query("BEGIN");
        const found = await db.query<Row>(`SELECT ${fields} FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`, [customerId]);
        if (!found.rows[0])
            throw new CustomerEditError("Cliente no encontrado.", 404);
        const current = decode(found.rows[0]);
        const emailChanged = contact.email !== current.email;
        if (emailChanged && current.emailVerified)
            throw new CustomerEditError("El correo ya está verificado y no se puede modificar.");
        const changed = contact.firstName !== current.firstName || contact.lastName !== current.lastName || contact.whatsapp !== current.whatsapp || emailChanged;
        if (!changed) {
            await db.query("COMMIT");
            return { customer: current, changed: false, emailChanged: false };
        }
        if (b.expectedVersion !== current.version)
            throw new CustomerEditError("Los datos cambiaron. Cierra y vuelve a abrir la edición.", 409);
        if (emailChanged) {
            // Serialize old/new addresses with the database registration guard.
            // Hold the old address until every previously issued verification JWT expires.
            for (const email of [current.email, contact.email].sort())
                await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`oc-email:${email}`]);
            await db.query(`DELETE FROM ${t("oc_client_email_reservations")} WHERE expires_at<now()`);
            await db.query(`INSERT INTO ${t("oc_client_email_reservations")}(email,customer_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second') ON CONFLICT(email) DO UPDATE SET customer_id=EXCLUDED.customer_id,expires_at=EXCLUDED.expires_at`, [current.email, customerId, CUSTOMER_OLD_EMAIL_HOLD_SECONDS]);
        }
        const updated = await db.query<Row>(`UPDATE ${t("oc_client_user")} SET "firstName"=$2,"lastName"=$3,name=$2||' '||$3,email=$4,"whatsappCipher"=$5,"whatsappVerified"=CASE WHEN $6 THEN false ELSE "whatsappVerified" END,"updatedAt"=now() WHERE id=$1 RETURNING ${fields}`, [customerId, contact.firstName, contact.lastName, contact.email, contact.whatsapp === current.whatsapp ? found.rows[0].whatsappCipher : protectClientValue(contact.whatsapp, "whatsapp"), contact.whatsapp !== current.whatsapp]);
        if (emailChanged) {
            // Recovery links identify the user, so revoke links sent to the old address.
            await db.query(`DELETE FROM ${t("oc_client_session")} WHERE "userId"=$1`, [customerId]);
            await db.query(`DELETE FROM ${t("oc_client_verification")} WHERE value=$1`, [customerId]);
        }
        await db.query(`INSERT INTO ${t("oc_client_profile_changes")}(id,customer_id,actor,payload_enc) VALUES($1,$2,$3,$4)`, [randomUUID(), customerId, actor, protectClientValue(JSON.stringify({ before: { firstName: current.firstName, lastName: current.lastName, email: current.email, whatsapp: current.whatsapp }, after: contact }), "profile-change")]);
        await db.query("COMMIT");
        return { customer: decode(updated.rows[0]), changed: true, emailChanged };
    }
    catch (error) {
        await db.query("ROLLBACK");
        if (error && typeof error === "object" && "code" in error) {
            if (error.code === "23505")
                throw new CustomerEditError("Ese correo no está disponible para este cliente.", 409);
            if (error.code === "42P01")
                throw new CustomerEditError("La edición de clientes todavía no está habilitada.", 503);
        }
        throw error;
    }
    finally {
        db.release();
    }
}
