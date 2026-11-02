// @vitest-environment node
import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({staff:vi.fn(),query:vi.fn(),stored:vi.fn(),pdf:vi.fn()}));
vi.mock("@/lib/clients/admin",()=>({customerAdminSession:m.staff}));vi.mock("@/lib/clients/db",()=>({clientPool:()=>({query:m.query}),clientTable:(n:string)=>n}));vi.mock("@/lib/clients/commitments",()=>({getStoredCommitment:m.stored}));vi.mock("@/lib/clients/credit-agreement-pdf",()=>({creditAgreementPdf:m.pdf}));
import {GET} from "./route";
const id="00000000-0000-4000-8000-000000000001",ctx={params:Promise.resolve({id})},request=new Request("https://opticaycristal.cl/api/admin/clientes/ventas/example/compromiso/pdf");
beforeEach(()=>vi.clearAllMocks());
it("no consulta documentos sin sesión del personal",async()=>{m.staff.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(401);expect(m.query).not.toHaveBeenCalled();});
it("solo descarga un documento existente de la venta consultada, sin generar otro",async()=>{m.staff.mockResolvedValue({u:"staff"});m.query.mockResolvedValue({rows:[{user_id:"owner",status:"active",signed_at:null}]});m.stored.mockResolvedValue({version:"saved"});m.pdf.mockResolvedValue(new Uint8Array([37,80,68,70]));const r=await GET(request,ctx);expect(r.status).toBe(200);expect(r.headers.get("content-type")).toBe("application/pdf");expect(r.headers.get("cache-control")).toContain("no-store");expect(m.stored).toHaveBeenCalledWith(id,"owner");expect(m.query).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^SELECT/),[id]);});
it("informa cuando aún no existe compromiso y no intenta generar PDF",async()=>{m.staff.mockResolvedValue({u:"staff"});m.query.mockResolvedValue({rows:[{user_id:"owner"}]});m.stored.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(409);expect(m.pdf).not.toHaveBeenCalled();});
