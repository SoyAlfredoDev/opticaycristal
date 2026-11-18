import "server-only";
import { randomUUID } from "node:crypto";
import { clientPool, clientTable as t } from "./db";
import { clientFingerprint, protectClientValue, revealClientValue } from "./privacy";
import { parseCustomerContact, parseCustomerEmail } from "./validation";
import { CUSTOMER_OLD_EMAIL_HOLD_SECONDS } from "./email-token-policy";
import { consumeStaffContactChallenge, ensureStaffEmailAvailable, sendStaffContactChallenge } from "./staff-contact-challenge";
import { readCustomerDocument } from "./customer-document-store";
import type { ForeignCustomerDocument } from "./customer-document";
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
    hasCredential: boolean;
};
export type EditableCustomer = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    emailEditable: boolean;
    whatsapp: string;
    whatsappVerified: boolean;
    rut: string;
    document?: ForeignCustomerDocument;
    version: string;
};
function id(value: string) { if (!value || value.length > 120)
    throw new CustomerEditError("Cliente no válido."); return value; }
const hasCredential = () => `EXISTS (SELECT 1 FROM ${t("oc_client_account")} a WHERE a."userId"=u.id AND a."providerId"='credential')`;
const fields = 'id,"firstName","lastName",email,"emailVerified","whatsappCipher","whatsappVerified","rutCipher"';
function decode(r: Row): EditableCustomer { const whatsapp = revealClientValue(r.whatsappCipher, "whatsapp"); return { id: r.id, firstName: r.firstName, lastName: r.lastName, email: r.email, emailVerified: r.emailVerified, emailEditable: false, whatsapp, whatsappVerified: r.whatsappVerified, ...readCustomerDocument(r.rutCipher), version: clientFingerprint(JSON.stringify([r.id, r.firstName, r.lastName, r.email, r.emailVerified, r.hasCredential, whatsapp, r.whatsappVerified]), "profile-version") }; }
export async function editableCustomer(customerId: string) { const r = await clientPool().query<Row>(`SELECT ${fields},${hasCredential()} AS "hasCredential" FROM ${t("oc_client_user")} u WHERE id=$1`, [id(customerId)]); if (!r.rows[0])
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
        const found = await db.query<Row>(`SELECT ${fields},${hasCredential()} AS "hasCredential" FROM ${t("oc_client_user")} u WHERE id=$1 FOR NO KEY UPDATE OF u`, [customerId]);
        if (!found.rows[0])
            throw new CustomerEditError("Cliente no encontrado.", 404);
        const current = decode(found.rows[0]);
        if (contact.email !== current.email)
            throw new CustomerEditError("Un administrador debe verificar el nuevo correo antes de cambiarlo.", 409);
        const phoneChanged = contact.whatsapp !== current.whatsapp;
        const changed = contact.firstName !== current.firstName || contact.lastName !== current.lastName || phoneChanged;
        if (!changed) {
            await db.query("COMMIT");
            return { customer: current, changed: false, emailChanged: false };
        }
        if (b.expectedVersion !== current.version)
            throw new CustomerEditError("Los datos cambiaron. Cierra y vuelve a abrir la edición.", 409);
        const updated = await db.query<Row>(`UPDATE ${t("oc_client_user")} AS u SET "firstName"=$2,"lastName"=$3,
            name=$2||' '||$3,"whatsappCipher"=$4,"whatsappVerified"=CASE WHEN $5 THEN false ELSE "whatsappVerified" END,
            "updatedAt"=now() WHERE id=$1 RETURNING ${fields},${hasCredential()} AS "hasCredential"`,
            [customerId, contact.firstName, contact.lastName, phoneChanged ? protectClientValue(contact.whatsapp, "whatsapp") : found.rows[0].whatsappCipher, phoneChanged]);
        await db.query(`INSERT INTO ${t("oc_client_profile_changes")}(id,customer_id,actor,payload_enc) VALUES($1,$2,$3,$4)`, [randomUUID(), customerId, actor, protectClientValue(JSON.stringify({ before: { firstName: current.firstName, lastName: current.lastName, email: current.email, whatsapp: current.whatsapp }, after: contact }), "profile-change")]);
        await db.query("COMMIT");
        return { customer: decode(updated.rows[0]), changed: true, emailChanged: false };
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

function replacementEmail(raw: unknown) {
    try { return parseCustomerEmail(raw); }
    catch (error) { throw new CustomerEditError((error as Error).message); }
}

const emailChangeSubject = (id: string) => "email-change:" + id;

export async function sendCustomerEmailChange(customerId: string, actor: string, ip: string, rawEmail: unknown) {
    const email = replacementEmail(rawEmail);
    const current = await editableCustomer(customerId);
    if (email === current.email) throw new CustomerEditError("Ingresa un correo distinto al actual.");
    await ensureStaffEmailAvailable(email);
    return sendStaffContactChallenge(emailChangeSubject(current.id), current.version, email, actor, ip);
}

export async function confirmCustomerEmailChange(customerId: string, actor: string, raw: Record<string, unknown>) {
    const email = replacementEmail(raw.email);
    const db = await clientPool().connect();
    let committed = false;
    try {
        await db.query("BEGIN");
        const result = await db.query<Row>(`SELECT ${fields},${hasCredential()} AS "hasCredential"
            FROM ${t("oc_client_user")} u WHERE id=$1 FOR NO KEY UPDATE OF u`, [id(customerId)]);
        if (!result.rows[0]) throw new CustomerEditError("Cliente no encontrado.", 404);
        const current = decode(result.rows[0]);
        if (current.email === email) throw new CustomerEditError("Ingresa un correo distinto al actual.");
        const failure = await consumeStaffContactChallenge(db, emailChangeSubject(customerId), current.version, email, actor, raw);
        if (failure) {
            await db.query("COMMIT");
            committed = true;
            throw new CustomerEditError(failure);
        }
        // Serialize both addresses with the registration trigger. Reserve the old
        // address until any previously issued email verification JWT has expired.
        for (const address of [current.email, email].sort())
            await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`oc-email:${address}`]);
        await db.query(`DELETE FROM ${t("oc_client_email_reservations")} WHERE expires_at<now()`);
        await db.query(`INSERT INTO ${t("oc_client_email_reservations")}(email,customer_id,expires_at)
            VALUES($1,$2,now()+$3*interval '1 second') ON CONFLICT(email) DO UPDATE
            SET customer_id=EXCLUDED.customer_id,expires_at=EXCLUDED.expires_at`, [current.email, customerId, CUSTOMER_OLD_EMAIL_HOLD_SECONDS]);
        await db.query(`DELETE FROM ${t("oc_client_verification")} WHERE value=$1`, [customerId]);
        await db.query(`DELETE FROM ${t("oc_client_session")} WHERE "userId"=$1`, [customerId]);
        const updated = await db.query<Row>(`UPDATE ${t("oc_client_user")} AS u SET email=$2,"emailVerified"=true,"updatedAt"=now()
            WHERE id=$1 RETURNING ${fields},${hasCredential()} AS "hasCredential"`, [customerId, email]);
        const change = protectClientValue(JSON.stringify({ action: "staff-email-change", before: { email: current.email }, after: { email } }), "profile-change");
        await db.query(`INSERT INTO ${t("oc_client_profile_changes")}(id,customer_id,actor,payload_enc)
            VALUES($1,$2,$3,$4)`, [randomUUID(), customerId, actor, change]);
        await db.query("COMMIT");
        return { customer: decode(updated.rows[0]), verified: true };
    } catch (error) {
        if (!committed) await db.query("ROLLBACK");
        if (error && typeof error === "object" && "code" in error && error.code === "23505")
            throw new CustomerEditError("Ese correo ya está asociado o reservado para otra cuenta.", 409);
        throw error;
    } finally {
        db.release();
    }
}
