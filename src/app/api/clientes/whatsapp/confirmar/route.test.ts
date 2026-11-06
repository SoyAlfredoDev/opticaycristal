// @vitest-environment node
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),confirm:vi.fn()}));
vi.mock('@/lib/clients/auth',()=>({customerSession:m.session}));
vi.mock('@/lib/integrations/whatsapp-otp',async original=>({...await original<typeof import('@/lib/integrations/whatsapp-otp')>(),confirmWhatsappOtp:m.confirm}));
import {POST} from './route';
import {WhatsappVerificationError} from '@/lib/integrations/whatsapp-otp';
const body={requestId:'00000000-0000-4000-8000-000000000001',code:'a7k2'};
const req=(value:unknown=body,origin='https://opticaycristal.cl')=>new Request(origin+'/api/clientes/whatsapp/confirmar',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-real-ip':'192.0.2.1'},body:JSON.stringify(value)});
beforeEach(()=>{vi.stubEnv('CLIENT_APP_URL','https://opticaycristal.cl');m.session.mockResolvedValue({user:{id:'owner'}});m.confirm.mockResolvedValue({verified:true});});afterEach(()=>vi.unstubAllEnvs());
it('exige sesión y mismo origen antes de confirmar',async()=>{m.session.mockResolvedValue(null);expect((await POST(req())).status).toBe(401);m.session.mockResolvedValue({user:{id:'owner'}});expect((await POST(req(body,'https://other.example'))).status).toBe(403);expect(m.confirm).not.toHaveBeenCalled();});
it('usa exclusivamente la cuenta de la sesión y no cachea respuestas',async()=>{const response=await POST(req());expect(m.confirm).toHaveBeenCalledWith('owner',body,'192.0.2.1');expect(response.headers.get('cache-control')).toContain('no-store');expect(await response.json()).toEqual({verified:true});});
it('respeta Retry-After y oculta errores internos',async()=>{m.confirm.mockRejectedValueOnce(new WhatsappVerificationError('Espera.',429,90));let response=await POST(req());expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('90');m.confirm.mockRejectedValueOnce(Error('private database error'));response=await POST(req());expect(response.status).toBe(503);expect(await response.text()).not.toContain('private');});
it('rechaza cuerpos excesivos sin procesar el código',async()=>{expect((await POST(req({code:'x'.repeat(500)}))).status).toBe(400);expect(m.confirm).not.toHaveBeenCalled();});
