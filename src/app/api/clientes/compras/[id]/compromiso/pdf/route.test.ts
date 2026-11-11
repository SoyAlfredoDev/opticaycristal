// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),sale:vi.fn(),stored:vi.fn(),original:vi.fn(),pdf:vi.fn()}));
vi.mock("@/lib/clients/auth",()=>({customerSession:m.session}));
vi.mock("@/lib/clients/history",()=>({getCustomerDocumentSale:m.sale}));
vi.mock("@/lib/clients/commitments",()=>({getStoredCommitment:m.stored,storedAgreementPdf:m.original}));
vi.mock("@/lib/clients/credit-agreement-pdf",()=>({creditAgreementPdf:m.pdf}));
import { GET } from "./route";
const id="00000000-0000-4000-8000-000000000001";
const request=new Request("https://opticaycristal.cl/api/clientes/compras/"+id+"/compromiso/pdf?userId=other");
const ctx={params:Promise.resolve({id})};
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"owner"}});m.sale.mockResolvedValue({credit:13500,status:"active",signedAt:null});m.stored.mockResolvedValue({version:"saved"});m.pdf.mockResolvedValue(new Uint8Array([37,80,68,70]));});
it("requires a customer session before reading documents",async()=>{m.session.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(401);expect(m.sale).not.toHaveBeenCalled();expect(m.stored).not.toHaveBeenCalled();});
it("does not expose documents belonging to another customer",async()=>{m.sale.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(404);expect(m.sale).toHaveBeenCalledWith("owner",id);expect(m.stored).not.toHaveBeenCalled();expect(m.pdf).not.toHaveBeenCalled();});
it("downloads only the stored document scoped to the session owner",async()=>{const r=await GET(request,ctx);expect(r.status).toBe(200);expect(r.headers.get("content-type")).toBe("application/pdf");expect(r.headers.get("cache-control")).toContain("no-store");expect(m.sale).toHaveBeenCalledWith("owner",id);expect(m.stored).toHaveBeenCalledWith(id,"owner");});
it("does not create a missing agreement",async()=>{m.stored.mockResolvedValue(null);expect((await GET(request,ctx)).status).toBe(409);expect(m.pdf).not.toHaveBeenCalled();});

it("entrega los bytes originales del nuevo modelo sin regenerarlos",async()=>{m.stored.mockResolvedValue({model:{id:"approved-model"}});m.original.mockResolvedValue(Buffer.from("%PDF-frozen"));const r=await GET(request,ctx);expect(r.status).toBe(200);expect(await r.text()).toBe("%PDF-frozen");expect(m.original).toHaveBeenCalledWith(id,"owner");expect(m.pdf).not.toHaveBeenCalled();});
it("un fallo de integridad no provoca una regeneración silenciosa",async()=>{m.stored.mockResolvedValue({model:{id:"approved-model"}});m.original.mockRejectedValue(new Error("Integrity"));expect((await GET(request,ctx)).status).toBe(503);expect(m.pdf).not.toHaveBeenCalled();});
