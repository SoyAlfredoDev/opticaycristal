// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({ customer: vi.fn(), admin: vi.fn(), list: vi.fn(), sales: vi.fn(), create: vi.fn(), catalog: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/clients/auth', () => ({ customerSession: m.customer }));
vi.mock('@/lib/clients/admin', () => ({ customerAdminSession: m.admin }));
vi.mock('@/lib/webpay/store', () => ({ createCreditPayment: m.create, listWebpayPayments: m.list, listUnpaidSales: m.sales, createCatalogPayment: m.catalog, getWebpayPayment: vi.fn(), startWebpayPayment: vi.fn(), cancelUnstartedPayment: vi.fn(), reconcileWebpayPayment: vi.fn() }));
vi.mock('@/lib/webpay/http', async (original) => ({ ...await original<typeof import('./http')>(), limitPayments: m.limit }));
import { GET, POST } from '@/app/api/clientes/webpay/route';
import { POST as adminPost } from '@/app/api/admin/webpay/route';
const req = (body: unknown, origin = 'https://opticaycristal.cl') => new Request('https://opticaycristal.cl/api/clientes/webpay', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv('CLIENT_APP_URL', 'https://opticaycristal.cl'); vi.stubEnv('WEBPAY_ENABLED', 'true'); vi.stubEnv('WEBPAY_ENVIRONMENT', 'integration'); vi.stubEnv('VERCEL_ENV', 'preview'); m.customer.mockResolvedValue({ user: { id: 'owner' } }); m.admin.mockResolvedValue({ u: 'staff' }); m.list.mockResolvedValue([]); m.sales.mockResolvedValue([]); });
describe('Límites de autorización Webpay', () => {
    it('rechaza visitantes sin sesión', async () => { m.customer.mockResolvedValue(null); expect((await GET(new Request('https://opticaycristal.cl'))).status).toBe(401); expect((await POST(req({}))).status).toBe(401); expect(m.list).not.toHaveBeenCalled(); });
    it('rechaza origen cruzado antes de acceder a cobros', async () => { expect((await POST(req({ action: 'credit' }, 'https://evil.invalid'))).status).toBe(403); expect(m.create).not.toHaveBeenCalled(); });
    it('resuelve propietario desde sesión y prohíbe caché compartida', async () => { const r = await GET(new Request('https://opticaycristal.cl')); expect(r.status).toBe(200); expect(m.list).toHaveBeenCalledWith('owner'); expect(r.headers.get('cache-control')).toContain('no-store'); });
    it('registro público no equivale a administrador', async () => { m.admin.mockResolvedValue(null); expect((await adminPost(req({}))).status).toBe(401); expect(m.catalog).not.toHaveBeenCalled(); });
    it('API administrativa también exige mismo origen', async () => { expect((await adminPost(req({}, 'https://evil.invalid'))).status).toBe(403); });
    it('rechaza acción arbitraria', async () => { expect((await POST(req({ action: 'setPaid', amount: 1 }))).status).toBe(400); expect(m.create).not.toHaveBeenCalled(); });
});
