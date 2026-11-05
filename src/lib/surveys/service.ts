import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import { clientPool, clientTable as t } from '@/lib/clients/db';
import { clientFingerprint, protectClientValue, revealClientValue } from '@/lib/clients/privacy';
import { enviarConResend, resendConfigured } from '@/lib/mail/resend';
import { corporateEmailHtml, CLIENT_MAIL_COMPANY } from '@/lib/clients/mail';
import { CONTACTO_EMAIL } from '@/lib/solicitudes/types';
export class SurveyError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export function surveyOrigin() { const u = new URL(process.env.CLIENT_APP_URL || CLIENT_MAIL_COMPANY.website); if (u.username || u.password || u.pathname !== '/' || u.search || u.hash || (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)))
    throw Error('Origen inválido'); return u.origin; }
export function surveyMail(token: string, open: string) { const origin = surveyOrigin(), url = origin + '/encuesta/' + token; const subject = '¿Cómo fue tu experiencia? · Óptica & Cristal'; const security = 'Este enlace personal vence en 30 días. Responder es opcional. No solicitamos contraseñas ni datos de pago.'; const note = 'Medimos aperturas de forma aproximada y visitas al enlace para mejorar la atención. No compartas el enlace.'; return { subject, html: corporateEmailHtml({ title: subject, heading: 'Tu opinión nos ayuda a mejorar', purpose: 'Gracias por elegirnos. Cuéntanos cómo fue la atención, tu experiencia con la plataforma y la calidad de tus lentes o producto. Son solo tres preguntas y un comentario opcional.', action: 'Responder encuesta', url, eyebrow: 'Tu experiencia importa', security, note }).replace('</body>', `<img src="${origin}/api/encuestas/apertura/${open}" width="1" height="1" alt=""/></body>`), text: `Tu opinión nos ayuda a mejorar.\n\nTres preguntas y un comentario opcional: ${url}\n\n${security}\n${note}\n${CLIENT_MAIL_COMPANY.name}\nRUT ${CLIENT_MAIL_COMPANY.rut}\n${CLIENT_MAIL_COMPANY.address}`, replyTo: CONTACTO_EMAIL }; }
function validToken(token: string) { if (!/^[a-zA-Z0-9_-]{43}$/.test(token))
    throw new SurveyError('Este enlace no está disponible.', 404); }
export function parseAnswer(raw: unknown) { if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new SurveyError('Revisa tus respuestas.'); const b = raw as Record<string, unknown>; if (Object.keys(b).some(k => !['attention', 'platform', 'product', 'kind', 'comment'].includes(k)))
    throw new SurveyError('Datos no válidos.'); const score = (v: unknown, optional = false) => { if (optional && v === null)
    return null; if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5)
    throw new SurveyError('Selecciona una calificación de 1 a 5.'); return v; }; const attention = score(b.attention), platform = score(b.platform, true), product = score(b.product, true); if (b.comment !== undefined && typeof b.comment !== 'string')
    throw new SurveyError('Comentario no válido.'); const comment = String(b.comment ?? '').trim(); if (comment.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(comment))
    throw new SurveyError('El comentario admite hasta 2000 caracteres.'); if (b.kind !== undefined && b.kind !== null && !['suggestion', 'complaint'].includes(String(b.kind)))
    throw new SurveyError('Tipo no válido.'); if (comment && !b.kind)
    throw new SurveyError('Selecciona sugerencia o reclamo.'); return { attention, platform, product, kind: comment ? String(b.kind) : null, comment }; }
export async function surveyView(token: string) { validToken(token); const r = (await clientPool().query(`UPDATE ${t('oc_client_surveys')} SET visited_at=COALESCE(visited_at,now()) WHERE token_hash=$1 AND expires_at>now() RETURNING responded_at`, [clientFingerprint(token, 'survey-token')])).rows[0]; if (!r)
    throw new SurveyError('Este enlace venció o no está disponible.', 404); return { answered: !!r.responded_at }; }
export async function markSurveyOpened(token: string) { if (!/^[a-zA-Z0-9_-]{43}$/.test(token))
    return; await clientPool().query(`UPDATE ${t('oc_client_surveys')} SET opened_at=COALESCE(opened_at,now()) WHERE open_hash=$1 AND expires_at>now()`, [clientFingerprint(token, 'survey-open')]); }
export async function answerSurvey(token: string, raw: unknown) {
    validToken(token);
    const a = parseAnswer(raw), hash = clientFingerprint(JSON.stringify(a), 'survey-answer');
    const db = await clientPool().connect();
    try {
        await db.query('BEGIN');
        const r = (await db.query(`SELECT id,responded_at,answer_hash FROM ${t('oc_client_surveys')} WHERE token_hash=$1 AND expires_at>now() FOR UPDATE`, [clientFingerprint(token, 'survey-token')])).rows[0];
        if (!r)
            throw new SurveyError('Este enlace venció o no está disponible.', 404);
        if (r.responded_at) {
            if (r.answer_hash !== hash)
                throw new SurveyError('Esta encuesta ya fue respondida.', 409);
            await db.query('COMMIT');
            return;
        }
        await db.query(`UPDATE ${t('oc_client_surveys')} SET attention=$2,platform=$3,product=$4,comment_kind=$5,comment_cipher=$6,answer_hash=$7,responded_at=now() WHERE id=$1`, [r.id, a.attention, a.platform, a.product, a.kind, a.comment ? protectClientValue(a.comment, 'survey') : null, hash]);
        await db.query(`INSERT INTO ${t('oc_client_admin_notifications')}(event_key,kind,entity_id,reference) VALUES($1,'survey_received',$2,'Encuesta de satisfacción') ON CONFLICT(event_key) DO NOTHING`, ['survey:' + r.id, r.id]);
        await db.query('COMMIT');
    }
    catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
    finally {
        db.release();
    }
}
export async function dispatchSurvey() {
    if (process.env.CLIENT_SURVEYS_ENABLED !== 'true' || !resendConfigured())
        return { sent: 0, disabled: true };
    const pool = clientPool(), lease = randomUUID();
    await pool.query(`UPDATE ${t('oc_client_surveys')} SET state='failed',lease=NULL,lease_until=NULL WHERE state IN ('pending','processing') AND first_attempt_at<now()-interval '22 hours' AND (lease_until IS NULL OR lease_until<now())`);
    const job = (await pool.query(`WITH candidate AS(SELECT id FROM ${t('oc_client_surveys')} WHERE due_at<=now() AND (state='pending' OR(state='processing' AND lease_until<now())) ORDER BY due_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE ${t('oc_client_surveys')} q SET state='processing',lease=$1,lease_until=now()+interval '2 minutes' FROM candidate c WHERE q.id=c.id RETURNING q.*`, [lease])).rows[0];
    if (!job)
        return { sent: 0, empty: true };
    const person = (await pool.query(`SELECT u.email,s.status FROM ${t('oc_client_sales')} s JOIN ${t('oc_client_user')} u ON u.id=s.user_id WHERE s.id=$1`, [job.sale_id])).rows[0];
    if (!person || person.status !== 'active') {
        await pool.query(`UPDATE ${t('oc_client_surveys')} SET state='skipped',lease=NULL,lease_until=NULL WHERE id=$1 AND lease=$2`, [job.id, lease]);
        return { sent: 0 };
    }
    let secret: {
        token: string;
        open: string;
        to: string;
    };
    if (job.secrets_cipher) {
        secret = JSON.parse(revealClientValue(job.secrets_cipher, 'survey'));
        if (secret.to !== person.email) {
            await pool.query(`UPDATE ${t('oc_client_surveys')} SET state='failed',lease=NULL,lease_until=NULL WHERE id=$1 AND lease=$2`, [job.id, lease]);
            return { sent: 0 };
        }
    }
    else {
        secret = { token: randomBytes(32).toString('base64url'), open: randomBytes(32).toString('base64url'), to: person.email };
        const saved = await pool.query(`UPDATE ${t('oc_client_surveys')} SET secrets_cipher=$3,token_hash=$4,open_hash=$5,expires_at=now()+interval '30 days' WHERE id=$1 AND lease=$2`, [job.id, lease, protectClientValue(JSON.stringify(secret), 'survey'), clientFingerprint(secret.token, 'survey-token'), clientFingerprint(secret.open, 'survey-open')]);
        if (!saved.rowCount)
            return { sent: 0 };
    }
    const attempt = await pool.query(`UPDATE ${t('oc_client_surveys')} SET attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()) WHERE id=$1 AND lease=$2`, [job.id, lease]);
    if (!attempt.rowCount)
        return { sent: 0 };
    const result = await enviarConResend({ to: secret.to, ...surveyMail(secret.token, secret.open), idempotencyKey: 'survey-' + job.id });
    await pool.query(`UPDATE ${t('oc_client_surveys')} SET state=$3,sent_at=CASE WHEN $3='sent' THEN now() ELSE sent_at END,provider_id=$4,lease=NULL,lease_until=CASE WHEN $3='processing' THEN now()+interval '10 minutes' ELSE NULL END WHERE id=$1 AND lease=$2`, [job.id, lease, result.ok ? 'sent' : result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 500 && result.httpStatus !== 429 ? 'failed' : 'processing', result.id]);
    return { sent: result.ok ? 1 : 0 };
}
export async function listSurveys(offset = 0) { if (!Number.isInteger(offset) || offset < 0 || offset > 10000)
    throw new SurveyError('Página no válida.'); const pool = clientPool(); const [rows, summary] = await Promise.all([pool.query(`SELECT q.id,q.state,q.created_at,q.sent_at,q.opened_at,q.visited_at,q.responded_at,q.attention,q.platform,q.product,q.comment_kind,q.comment_cipher,s.product_name,u.name FROM ${t('oc_client_surveys')} q JOIN ${t('oc_client_sales')} s ON s.id=q.sale_id JOIN ${t('oc_client_user')} u ON u.id=s.user_id ORDER BY q.created_at DESC,q.id DESC LIMIT 26 OFFSET $1`, [offset]), pool.query(`SELECT count(*)::int AS total,count(sent_at)::int AS sent,count(opened_at)::int AS opened,count(visited_at)::int AS visited,count(responded_at)::int AS answered,round(avg(attention),1) AS attention,round(avg(platform),1) AS platform,round(avg(product),1) AS product FROM ${t('oc_client_surveys')}`)]); return { summary: summary.rows[0], hasMore: rows.rows.length > 25, items: rows.rows.slice(0, 25).map(({ comment_cipher, ...r }) => ({ ...r, comment: comment_cipher ? revealClientValue(comment_cipher, 'survey') : '' })) }; }
export async function limitSurvey(token: string, ip: string) { validToken(token); for (const value of ['token:' + token, 'ip:' + ip.slice(0, 100)]) {
    const r = await clientPool().query(`INSERT INTO ${t('oc_client_registration_limit')} AS l(key,count,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN l.reset_at<now() THEN 1 ELSE l.count+1 END,reset_at=CASE WHEN l.reset_at<now() THEN now()+interval '15 minutes' ELSE l.reset_at END RETURNING count`, [clientFingerprint(value, 'survey-rate')]);
    if (Number(r.rows[0].count) > 30)
        throw new SurveyError('Espera unos minutos antes de intentarlo otra vez.', 429);
} }
