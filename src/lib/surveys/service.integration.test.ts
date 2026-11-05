// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { seedLegacyContractSettings } from '../../../tests/fixtures/legacy-contract-settings';
const m = vi.hoisted(() => ({ pool: null as unknown, send: vi.fn() }));
vi.mock('@/lib/clients/db', () => ({ clientPool: () => m.pool, clientTable: (n: string) => `"${n}"` }));
vi.mock('@/lib/mail/resend', () => ({ resendConfigured: () => true, enviarConResend: m.send }));
import { createSale, parseSale, saveSaleProduct } from '@/lib/clients/sales';
import { protectClientValue, revealClientValue } from '@/lib/clients/privacy';
import { dispatchSurvey, surveyView, answerSurvey, parseAnswer, markSurveyOpened, listSurveys, surveyMail } from './service';
import { getAdminNotifications } from '@/lib/admin/notifications';
const db = new PGlite();
const c = { query: async (s: string, v?: unknown[]) => { const r = await db.query(s, v); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; }, release() { } };
m.pool = { query: c.query, connect: async () => c };
let product = '', sale = '', token = '', open = '';
beforeAll(async () => { vi.stubEnv('CLIENT_DATA_KEY', randomBytes(32).toString('base64')); vi.stubEnv('CLIENT_SURVEYS_ENABLED', 'true'); vi.stubEnv('CLIENT_APP_URL', 'https://opticaycristal.cl'); for (const f of ['001-customers', '002-sales', '003-audit', '004-support', '005-support-mail', '008-admin-notifications', '010-payment-commitments', '014-category-sale-pricing', '016-business-notifications', '024-satisfaction-surveys', '024-satisfaction-surveys'])
    await db.exec(await readFile('sql/clients/' + f + '.sql', 'utf8')); await seedLegacyContractSettings(db); product = await saveSaleProduct({ name: 'Prueba', protectedCost: 1 }, 'test'); m.send.mockResolvedValue({ ok: true, id: 'synthetic-provider', error: null }); }, 30000);
afterAll(async () => { await db.close(); vi.unstubAllEnvs(); });
async function sell(credit = 22500) { const id = randomUUID(); await db.query(`INSERT INTO oc_client_user(id,name,email,"firstName","lastName","rutCipher","rutHash","whatsappCipher","emailVerified",category) VALUES($1,'Sintético',$2,'Cliente','Prueba',$3,$1,$4,false,'start')`, [id, id + '@example.invalid', protectClientValue('123456785', 'rut'), protectClientValue('+56911112222', 'whatsapp')]); if (credit)
    await db.query('UPDATE oc_client_user SET "emailVerified"=true WHERE id=$1', [id]); return createSale(parseSale({ customerId: id, productId: product, quantity: 1, total: 75000, credit, installmentCount: credit ? 1 : 0, firstDueDate: credit ? '2030-01-31' : '', identityChecked: true, depositReceived: true, conditionsReviewed: true, pricingPolicy: 'category', requestKey: randomUUID() }), 'test'); }
describe.sequential('Encuesta: venta → correo → web → respuesta → notificación', () => {
    it('solo programa ventas a crédito, para el día calendario siguiente en Chile', async () => { sale = await sell(); await sell(0); const rows = (await db.query<{
        sale_id: string;
        correct: boolean;
    }>(`SELECT sale_id,due_at::date=((s.created_at AT TIME ZONE 'America/Santiago')::date+1) AS correct FROM oc_client_surveys q JOIN oc_client_sales s ON s.id=q.sale_id`)).rows; expect(rows).toHaveLength(1); expect(rows[0].sale_id).toBe(sale); expect(rows[0].correct).toBe(true); });
    it('no envía antes del día siguiente ni cuando está desactivado', async () => { expect(await dispatchSurvey()).toMatchObject({ empty: true }); await db.query("UPDATE oc_client_surveys SET due_at=now()-interval '1 minute'"); vi.stubEnv('CLIENT_SURVEYS_ENABLED', 'false'); expect(await dispatchSurvey()).toMatchObject({ disabled: true }); vi.stubEnv('CLIENT_SURVEYS_ENABLED', 'true'); expect(m.send).not.toHaveBeenCalled(); });
    it('envía un correo corporativo con enlace único y tracking separado, incluso sin verificación', async () => { await db.query('UPDATE oc_client_user SET "emailVerified"=false'); expect(await dispatchSurvey()).toEqual({ sent: 1 }); expect(await dispatchSurvey()).toMatchObject({ empty: true }); expect(m.send).toHaveBeenCalledTimes(1); const mail = m.send.mock.calls[0][0]; expect(mail.html).toContain('Huérfanos 713'); expect(mail.html).toContain('cid:'); const r = (await db.query<{
        secrets_cipher: string;
    }>('SELECT secrets_cipher FROM oc_client_surveys WHERE sale_id=$1', [sale])).rows[0]; const secrets = JSON.parse(revealClientValue(r.secrets_cipher, 'survey')); token = secrets.token; open = secrets.open; expect(token).not.toBe(open); expect(token).toHaveLength(43); expect(r.secrets_cipher).not.toContain(token); expect(mail.html).toContain('/encuesta/' + token); expect(mail.html).toContain('/api/encuestas/apertura/' + open); expect(mail.idempotencyKey).toMatch(/^survey-/); });
    it('token de apertura no permite responder y no mezcla apertura con visita', async () => { await markSurveyOpened(open); await markSurveyOpened(open); await expect(surveyView(open)).rejects.toThrow(); let row = (await db.query<{
        opened_at: unknown;
        visited_at: unknown;
    }>('SELECT opened_at,visited_at FROM oc_client_surveys WHERE sale_id=$1', [sale])).rows[0]; expect(row.opened_at).toBeTruthy(); expect(row.visited_at).toBeNull(); expect(await surveyView(token)).toEqual({ answered: false }); row = (await db.query<{
        opened_at: unknown;
        visited_at: unknown;
    }>('SELECT opened_at,visited_at FROM oc_client_surveys WHERE sale_id=$1', [sale])).rows[0]; expect(row.visited_at).toBeTruthy(); });
    it('valida puntuaciones, tres respuestas y límites del comentario', () => { for (const a of [{ attention: 0, platform: 3, product: 4 }, { attention: 5, product: 4 }, { attention: 5, platform: null, product: 4, kind: 'complaint', comment: 'x'.repeat(2001) }, { attention: 5, platform: 3, product: 4, admin: true }])
        expect(() => parseAnswer(a)).toThrow(); expect(parseAnswer({ attention: 5, platform: null, product: null })).toMatchObject({ platform: null, product: null }); });
    it('guarda comentario cifrado y crea una sola notificación; reintento idéntico es seguro', async () => { const input = { attention: 4, platform: null, product: 5, kind: 'suggestion', comment: 'Mejorar tiempos <script>alert(1)</script>' }; await answerSurvey(token, input); await answerSurvey(token, input); await expect(answerSurvey(token, { ...input, attention: 1 })).rejects.toThrow('ya fue'); const q = (await db.query<{
        comment_cipher: string;
    }>('SELECT comment_cipher FROM oc_client_surveys WHERE sale_id=$1', [sale])).rows[0]; expect(q.comment_cipher).not.toContain('script'); expect(await surveyView(token)).toEqual({ answered: true }); const feed = await getAdminNotifications('admin'); expect(feed.items.filter(i => i.kind === 'survey_received')).toHaveLength(1); expect(feed.items.find(i => i.kind === 'survey_received')?.href).toBe('/admin/encuestas'); const d = await listSurveys(); expect(d.summary).toMatchObject({ answered: 1, attention: '4.0', platform: null, product: '5.0' }); expect(d.items[0].comment).toBe(input.comment); expect(JSON.stringify(d)).not.toMatch(/token_hash|secrets_cipher|open_hash/); });
    it('enlace vencido o inventado no permite ver ni guardar', async () => { await db.query("UPDATE oc_client_surveys SET expires_at=now()-interval '1 second' WHERE sale_id=$1", [sale]); await expect(surveyView(token)).rejects.toThrow(); await expect(answerSurvey(token, { attention: 5, platform: 5, product: 5 })).rejects.toThrow(); await expect(surveyView('x'.repeat(43))).rejects.toThrow(); });
    it('omite una venta anulada antes del envío', async () => { const id = await sell(); await db.query("UPDATE oc_client_surveys SET due_at=now()-interval '1 minute' WHERE sale_id=$1", [id]); await db.query("UPDATE oc_client_sales SET status='cancelled' WHERE id=$1", [id]); const before = m.send.mock.calls.length; expect(await dispatchSurvey()).toEqual({ sent: 0 }); expect(m.send.mock.calls.length).toBe(before); });
    it('recupera envío incierto con mismo destinatario, token y clave de idempotencia', async () => { const id = await sell(); await db.query("UPDATE oc_client_surveys SET due_at=now()-interval '1 minute' WHERE sale_id=$1", [id]); m.send.mockResolvedValueOnce({ ok: false, id: null, error: 'timeout' }); await dispatchSurvey(); const first = m.send.mock.calls.at(-1)![0]; await db.query("UPDATE oc_client_surveys SET lease_until=now()-interval '1 second' WHERE sale_id=$1", [id]); await dispatchSurvey(); const second = m.send.mock.calls.at(-1)![0]; expect(second).toEqual(first); });
    it('envíos inciertos antiguos requieren revisión humana y no duplican correo', async () => { const id = await sell(); await db.query("UPDATE oc_client_surveys SET due_at=now()-interval '1 minute',first_attempt_at=now()-interval '23 hours',attempts=1 WHERE sale_id=$1", [id]); const before = m.send.mock.calls.length; await dispatchSurvey(); expect(m.send.mock.calls.length).toBe(before); expect((await db.query('SELECT state FROM oc_client_surveys WHERE sale_id=$1', [id])).rows[0]).toEqual({ state: 'failed' }); });
    it('contenido del correo incluye identidad corporativa y no pide datos bancarios', async () => { const mail = surveyMail('a'.repeat(43), 'b'.repeat(43)); expect(mail.html).toContain('77.068.257-6'); expect(mail.text).toContain('30 días'); expect(mail.html).toContain('calidad'); await mkdir('output/surveys', { recursive: true }); await writeFile('output/surveys/mail-preview.html', mail.html); });
});
