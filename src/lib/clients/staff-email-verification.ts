import "server-only";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { clientPool, clientTable as t } from "./db";
import { clientFingerprint } from "./privacy";
import { sendStaffVerificationCode } from "./mail";
export class StaffEmailCodeError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
const emailHash = (email: string) => clientFingerprint(email, "staff-email-address");
const codeHash = (code: string, request: string, user: string, email: string) => clientFingerprint(code, `staff-email-code:${request}:${user}:${email}`);
function validCustomer(id: string) { if (!id || id.length > 120)
    throw new StaffEmailCodeError("Cliente no válido."); }
export async function sendCustomerEmailCode(userId: string, actor: string) {
    validCustomer(userId);
    const db = await clientPool().connect(), requestId = randomUUID(), code = String(randomInt(10000)).padStart(4, "0");
    let email = "";
    try {
        await db.query("BEGIN");
        const user = (await db.query(`SELECT email,"emailVerified" FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`, [userId])).rows[0];
        if (!user)
            throw new StaffEmailCodeError("Cliente no encontrado.", 404);
        if (user.emailVerified) {
            await db.query("COMMIT");
            return { verified: true };
        }
        email = user.email;
        const previous = (await db.query(`SELECT *,resend_at>now() AS waiting,window_started_at>now()-interval '1 hour' AS same_hour,day_started_at>now()-interval '1 day' AS same_day FROM ${t("oc_client_staff_email_codes")} WHERE user_id=$1 FOR UPDATE`, [userId])).rows[0];
        if (previous && (previous.waiting || (previous.same_hour && previous.sent_count >= 3) || (previous.same_day && previous.day_count >= 6)))
            throw new StaffEmailCodeError(previous.waiting ? "Espera un minuto antes de enviar otro código." : "Se alcanzó el límite de envíos. Inténtalo más tarde.", 429);
        await db.query(`INSERT INTO ${t("oc_client_staff_email_codes")}(user_id,request_id,actor,email_hash,code_hash,expires_at,resend_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes',now()+interval '1 minute') ON CONFLICT(user_id) DO UPDATE SET request_id=EXCLUDED.request_id,actor=EXCLUDED.actor,email_hash=EXCLUDED.email_hash,code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,resend_at=EXCLUDED.resend_at,attempts=0,verified_at=NULL,sent_count=CASE WHEN oc_client_staff_email_codes.window_started_at>now()-interval '1 hour' THEN oc_client_staff_email_codes.sent_count+1 ELSE 1 END,window_started_at=CASE WHEN oc_client_staff_email_codes.window_started_at>now()-interval '1 hour' THEN oc_client_staff_email_codes.window_started_at ELSE now() END,day_count=CASE WHEN oc_client_staff_email_codes.day_started_at>now()-interval '1 day' THEN oc_client_staff_email_codes.day_count+1 ELSE 1 END,day_started_at=CASE WHEN oc_client_staff_email_codes.day_started_at>now()-interval '1 day' THEN oc_client_staff_email_codes.day_started_at ELSE now() END`, [userId, requestId, actor, emailHash(email), codeHash(code, requestId, userId, email)]);
        await db.query("COMMIT");
    }
    catch (e) {
        await db.query("ROLLBACK");
        throw e;
    }
    finally {
        db.release();
    }
    try {
        await sendStaffVerificationCode(email, code, requestId);
    }
    catch {
        await clientPool().query(`UPDATE ${t("oc_client_staff_email_codes")} SET code_hash=NULL WHERE user_id=$1 AND request_id=$2`, [userId, requestId]);
        throw new StaffEmailCodeError("No se pudo confirmar el envío del código. Inténtalo nuevamente en un minuto.", 503);
    }
    return { requestId, expiresIn: 600 };
}
export async function confirmCustomerEmailCode(userId: string, raw: Record<string, unknown>, actor: string) {
    validCustomer(userId);
    if (typeof raw.requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(raw.requestId) || typeof raw.code !== "string" || raw.code.length !== 4 || !/^\d{4}$/.test(raw.code))
        throw new StaffEmailCodeError("Ingresa los cuatro dígitos del código.");
    const db = await clientPool().connect();
    let failure = "";
    try {
        await db.query("BEGIN");
        const user = (await db.query(`SELECT email,"emailVerified" FROM ${t("oc_client_user")} WHERE id=$1 FOR UPDATE`, [userId])).rows[0];
        const saved = (await db.query(`SELECT *,expires_at<=now() AS expired FROM ${t("oc_client_staff_email_codes")} WHERE user_id=$1 FOR UPDATE`, [userId])).rows[0];
        if (!user || !saved || saved.request_id !== raw.requestId || saved.actor !== actor || !saved.code_hash || saved.verified_at || saved.attempts >= 5 || saved.expired || saved.email_hash !== emailHash(user.email) || user.emailVerified)
            failure = "El código venció, ya se usó o no corresponde. Solicita uno nuevo.";
        else {
            const candidate = codeHash(raw.code, raw.requestId, userId, user.email);
            if (!timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(saved.code_hash, "hex"))) {
                await db.query(`UPDATE ${t("oc_client_staff_email_codes")} SET attempts=attempts+1,code_hash=CASE WHEN attempts+1>=5 THEN NULL ELSE code_hash END WHERE user_id=$1`, [userId]);
                failure = "Código incorrecto. Revisa los cuatro dígitos recibidos.";
            }
            else {
                await db.query(`UPDATE ${t("oc_client_user")} SET "emailVerified"=true,"updatedAt"=now() WHERE id=$1`, [userId]);
                await db.query(`UPDATE ${t("oc_client_staff_email_codes")} SET code_hash=NULL,verified_at=now() WHERE user_id=$1`, [userId]);
            }
        }
        // Keep failed attempts committed; rolling them back would disable the guess limit.
        await db.query("COMMIT");
    }
    catch (e) {
        await db.query("ROLLBACK");
        throw e;
    }
    finally {
        db.release();
    }
    if (failure)
        throw new StaffEmailCodeError(failure);
    return { verified: true };
}
