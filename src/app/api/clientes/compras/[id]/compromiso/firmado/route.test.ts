// @vitest-environment node
import {beforeEach,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),sale:vi.fn(),signed:vi.fn()}));
vi.mock("@/lib/clients/auth",()=>({customerSession:m.session}));vi.mock("@/lib/clients/history",()=>({getCustomerDocumentSale:m.sale}));vi.mock("@/lib/clients/agreement-acceptance",()=>({signedAgreement:m.signed}));
import {GET} from "./route";
const id="00000000-0000-4000-8000-000000000001",ctx={params:Promise.resolve({id})},request=new Request("https://opticaycristal.cl/api/clientes/compras/"+id+"/compromiso/firmado?userId=other");
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"owner"}});m.sale.mockResolvedValue({credit:20000});m.signed.mockResolvedValue({bytes:Buffer.from("%PDF-QA")});});
it("no expone el ejemplar firmado sin sesión ni a un cliente ajeno",async()=>{m.session.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(401);m.session.mockResolvedValue({user:{id:"owner"}});m.sale.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(404);expect(m.signed).not.toHaveBeenCalled();});
it("descarga únicamente el respaldo de la venta del titular autenticado",async()=>{const r=await GET(request,ctx);expect(r.status).toBe(200);expect(m.sale).toHaveBeenCalledWith("owner",id);expect(m.signed).toHaveBeenCalledWith(id);expect(r.headers.get("cache-control")).toContain("no-store");});
