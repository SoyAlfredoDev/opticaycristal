// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({drain:vi.fn()}));
vi.mock('@/lib/clients/level-mail',()=>({drainLevelUpgradeMail:m.drain}));
import {GET} from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('no procesa la cola sin una credencial del programador válida',async()=>{
 vi.stubEnv('CRON_SECRET','synthetic-cron-secret');
 for(const authorization of ['', 'Bearer wrong']){const r=await GET(new Request('https://local/api/admin/clientes/nivel-correos',{headers:{authorization}}));expect(r.status).toBe(401);}
 expect(m.drain).not.toHaveBeenCalled();
});
it('informa que el envío está desactivado sin confundirlo con un correo entregado',async()=>{
 vi.stubEnv('CRON_SECRET','synthetic-cron-secret');m.drain.mockResolvedValue({accepted:0,disabled:true});
 const r=await GET(new Request('https://local/api/admin/clientes/nivel-correos',{headers:{authorization:'Bearer synthetic-cron-secret'}}));expect(r.status).toBe(200);expect(await r.json()).toEqual({accepted:0,disabled:true});expect(r.headers.get('cache-control')).toContain('no-store');
});
it('limita el procesamiento a tres avisos por ejecución del respaldo diario',async()=>{
 vi.stubEnv('CRON_SECRET','synthetic-cron-secret');m.drain.mockResolvedValue({accepted:1});
 const r=await GET(new Request('https://local/api/admin/clientes/nivel-correos',{headers:{authorization:'Bearer synthetic-cron-secret'}}));
 expect(await r.json()).toEqual({accepted:3});expect(m.drain).toHaveBeenCalledTimes(3);
});
