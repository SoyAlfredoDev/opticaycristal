// @vitest-environment node
import {it,expect,vi} from 'vitest';
vi.mock('@/lib/clients/admin',()=>({customerAdminSession:async()=>null}));
import {GET as file} from '@/app/api/admin/integraciones/cris/adjuntos/[id]/route';
import {GET as metadata} from '@/app/api/admin/integraciones/cris/tickets/[id]/route';
it('un bearer de Cris no sustituye una sesión administrativa para descargar archivos',async()=>{const r=new Request('https://opticaycristal.cl/api/admin/integraciones/cris/adjuntos/synthetic',{headers:{Authorization:'Bearer synthetic-test-token'}});expect((await file(r,{params:Promise.resolve({id:'10000000-0000-4000-8000-000000000001'})})).status).toBe(401);});
it('los metadatos de adjuntos también exigen personal administrador',async()=>{expect((await metadata(new Request('https://opticaycristal.cl/api/admin/integraciones/cris/tickets/synthetic'),{params:Promise.resolve({id:'10000000-0000-4000-8000-000000000001'})})).status).toBe(401);});
