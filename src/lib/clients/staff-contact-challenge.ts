import "server-only";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { clientPool, clientTable as t } from "./db";
import { clientFingerprint } from "./privacy";
import { sendStaffVerificationCode } from "./mail";
import { AdminCreateError, limitStaffCustomerAction } from "./staff-customer-limits";
import { StaffEmailCodeError } from "./staff-email-verification";

const table = () => t("oc_client_staff_contact_challenges");
const hashSubject = (subject: string) => clientFingerprint(subject, "staff-contact-subject");
const hashEmail = (email: string) => clientFingerprint(email, "staff-contact-address");
const hashCode = (code: string, id: string, subject: string, actor: string, email: string) =>
    clientFingerprint(code, JSON.stringify(["staff-contact-code", id, subject, actor, email]));

export async function sendStaffContactChallenge(subject: string, binding: string, email: string, actor: string, ip: string) {
    const key = hashSubject(subject);
    await limitStaffCustomerAction(actor, "contact-email-actor", 30);
    await limitStaffCustomerAction(ip, "contact-email-ip", 60);
    await limitStaffCustomerAction("all", "contact-email-global", 120);
    await limitStaffCustomerAction(email, "contact-email-address", 3);
    await limitStaffCustomerAction(key, "contact-email-subject", 6);
    const db = clientPool();
    const requestId = randomUUID();
    const code = String(randomInt(10000)).padStart(4, "0");
    await db.query(`DELETE FROM ${table()} WHERE expires_at<=now()`);
    await db.query(`INSERT INTO ${table()}(subject_hash,request_id,actor,email_hash,code_hash,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')
        ON CONFLICT(subject_hash) DO UPDATE SET request_id=EXCLUDED.request_id,actor=EXCLUDED.actor,
        email_hash=EXCLUDED.email_hash,code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,attempts=0,sent_at=NULL`,
        [key, requestId, actor, hashEmail(email), hashCode(code, requestId, binding, actor, email)]);
    try {
        await sendStaffVerificationCode(email, code, requestId);
    } catch {
        await db.query(`DELETE FROM ${table()} WHERE subject_hash=$1 AND request_id=$2`, [key, requestId]);
        throw new StaffEmailCodeError("No pudimos confirmar el envío del código. Inténtalo nuevamente.", 503);
    }
    const sent = await db.query(`UPDATE ${table()} SET sent_at=now() WHERE subject_hash=$1 AND request_id=$2 RETURNING request_id`, [key, requestId]);
    if (!sent.rows.length) throw new StaffEmailCodeError("Ya se solicitó otro código. Usa la solicitud más reciente.", 409);
    return { requestId, expiresIn: 600 };
}

export async function consumeStaffContactChallenge(db: PoolClient, subject: string, binding: string, email: string, actor: string, proof: Record<string, unknown>) {
    if (typeof proof.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(proof.requestId) ||
        typeof proof.code !== "string" || !/^\d{4}$/.test(proof.code))
        return "Ingresa el código de cuatro dígitos enviado al correo.";
    const key = hashSubject(subject);
    const { rows: [saved] } = await db.query(`SELECT *,expires_at>now() AS live FROM ${table()} WHERE subject_hash=$1 FOR UPDATE`, [key]);
    if (!saved?.live || !saved.sent_at || !saved.code_hash || saved.request_id !== proof.requestId ||
        saved.actor !== actor || saved.email_hash !== hashEmail(email) || saved.attempts >= 5)
        return "El código venció, ya se usó o no corresponde. Solicita uno nuevo.";
    const candidate = Buffer.from(hashCode(proof.code, proof.requestId, binding, actor, email), "hex");
    if (!timingSafeEqual(candidate, Buffer.from(saved.code_hash, "hex"))) {
        await db.query(`UPDATE ${table()} SET attempts=attempts+1,code_hash=CASE WHEN attempts+1=5 THEN NULL ELSE code_hash END WHERE subject_hash=$1`, [key]);
        return saved.attempts === 4 ? "Se agotaron los intentos. Solicita un código nuevo." : "Código incorrecto. Revisa los cuatro dígitos recibidos.";
    }
    await db.query(`DELETE FROM ${table()} WHERE subject_hash=$1`, [key]);
    return null;
}

export async function ensureStaffEmailAvailable(email: string) {
    const result = await clientPool().query(`SELECT 1 FROM ${t("oc_client_user")} WHERE email=$1
        UNION ALL SELECT 1 FROM ${t("oc_client_email_reservations")} WHERE email=$1 AND expires_at>now() LIMIT 1`, [email]);
    if (result.rows.length) throw new AdminCreateError("Ese correo ya está asociado o reservado para otra cuenta.", 409);
}
