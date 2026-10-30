// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({staff:vi.fn(),create:vi.fn(),lookup:vi.fn(),products:vi.fn(),quote:vi.fn(),payment:vi.fn(),product:vi.fn(),profile:vi.fn()}));
vi.mock("@/lib/clients/admin",()=>({customerAdminSession:m.staff,canManageProductCosts:()=>false}));
vi.mock("@/lib/clients/operations",()=>({executeSaleOperation:m.create,prepareSaleOperation:vi.fn(),recoverSaleOperation:vi.fn()}));
vi.mock("@/lib/clients/store",()=>({getCustomerProfile:m.profile}));
vi.mock("@/lib/clients/sales",()=>({changeSaleState:vi.fn(),reverseSalePayment:vi.fn(),createSale:m.create,findCustomerByRut:m.lookup,listSaleProducts:m.products,parseSale:(x:unknown)=>x,quoteSale:m.quote,recordSalePayment:m.payment,saveSaleProduct:m.product,SaleError:class extends Error{}}));
import { GET,POST } from "./route";
function request(action:string,origin="http://localhost:3000"){return new Request("http://localhost:3000/api/admin/clientes/ventas",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({action})});}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("CLIENT_APP_URL","http://localhost:3000");});
describe("Permisos de ventas",()=>{
 it("rechaza consultas y todas las mutaciones sin sesión del personal",async()=>{m.staff.mockResolvedValue(null);expect((await GET()).status).toBe(401);for(const action of ["lookup","quote","prepare","execute","product","recover","cancel","reverse","sign"])expect((await POST(request(action))).status).toBe(401);expect(m.create).not.toHaveBeenCalled();expect(m.payment).not.toHaveBeenCalled();});
 it("rechaza origen ajeno aun con sesión administrativa",async()=>{m.staff.mockResolvedValue({u:"seller"});expect((await POST(request("execute","https://other.example"))).status).toBe(403);expect(m.create).not.toHaveBeenCalled();});
 it("toma el vendedor de la sesión y responde sin caché",async()=>{m.staff.mockResolvedValue({u:"seller"});m.create.mockResolvedValue("sale");const r=await POST(request("execute"));expect(r.status).toBe(200);expect(m.create).toHaveBeenCalledWith(undefined,"seller");expect(r.headers.get("cache-control")).toContain("no-store");});
 it("impide editar costos a un vendedor sin permiso",async()=>{m.staff.mockResolvedValue({u:"seller"});expect((await POST(request("product"))).status).toBe(403);expect(m.product).not.toHaveBeenCalled();});
});
