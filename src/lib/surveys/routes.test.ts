// @vitest-environment node
import { it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({ admin: vi.fn(), list: vi.fn(), answer: vi.fn(), view: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/clients/admin', () => ({ customerAdminSession: m.admin }));
vi.mock('@/lib/surveys/service', async (original) => ({ ...await original<typeof import('./service')>(), listSurveys: m.list, answerSurvey: m.answer, surveyView: m.view, limitSurvey: m.limit }));
import { GET as adminGet } from '@/app/api/admin/encuestas/route';
import { POST, GET } from '@/app/api/encuestas/[token]/route';
import { GET as cron } from '@/app/api/cron/encuestas/route';
it('administración requiere sesión autorizada antes de leer respuestas', async () => { m.admin.mockResolvedValue(null); expect((await adminGet(new Request('https://opticaycristal.cl/api/admin/encuestas'))).status).toBe(401); expect(m.list).not.toHaveBeenCalled(); });
it('rechaza origen ajeno y no escribe', async () => { vi.stubEnv('CLIENT_APP_URL', 'https://opticaycristal.cl'); expect((await POST(new Request('https://opticaycristal.cl/api/encuestas/x', { method: 'POST', headers: { origin: 'https://evil.invalid' } }), { params: Promise.resolve({ token: 'a'.repeat(43) }) })).status).toBe(403); expect(m.answer).not.toHaveBeenCalled(); vi.unstubAllEnvs(); });
it('la tarea de envío nunca es pública', async () => { vi.stubEnv('CRON_SECRET', 'test-secret'); expect((await cron(new Request('https://opticaycristal.cl/api/cron/encuestas'))).status).toBe(401); vi.unstubAllEnvs(); });
it('el enlace devuelve solo estado mínimo con no-store', async () => { m.view.mockResolvedValue({ answered: false }); const r = await GET(new Request('https://opticaycristal.cl'), { params: Promise.resolve({ token: 'a'.repeat(43) }) }); expect(await r.json()).toEqual({ answered: false }); expect(r.headers.get('cache-control')).toContain('no-store'); });
