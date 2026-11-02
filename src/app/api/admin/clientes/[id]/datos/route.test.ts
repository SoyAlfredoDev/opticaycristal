// @vitest-environment node
import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({staff:vi.fn(),read:vi.fn(),write:vi.fn()}));vi.mock("@/lib/clients/admin",()=>({customerAdminSession:m.staff}));vi.mock("@/lib/clients/customer-edit",()=>({editableCustomer:m.read,updateCustomerDetails:m.write,CustomerEditError:class extends Error{status=409}}));
import {GET,POST} from "./route";
const ctx={params:Promise.resolve({id:"customer"})};const request=(origin="http://localhost:3033")=>new Request("http://localhost:3033/api/admin/clientes/customer/datos",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({firstName:"Cliente"})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("CLIENT_APP_URL","http://localhost:3033");});
it("protege la consulta y la edición con sesión administrativa y origen",async()=>{m.staff.mockResolvedValue(null);expect((await GET(request(),ctx)).status).toBe(401);expect((await POST(request(),ctx)).status).toBe(401);m.staff.mockResolvedValue({u:"staff"});expect((await POST(request("https://other.invalid"),ctx)).status).toBe(403);expect(m.write).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled();});
it("usa la identidad de la sesión y evita caché de datos personales",async()=>{m.staff.mockResolvedValue({u:"staff"});m.write.mockResolvedValue({changed:true});const r=await POST(request(),ctx);expect(r.status).toBe(200);expect(r.headers.get("cache-control")).toContain("no-store");expect(m.write).toHaveBeenCalledWith("customer",{firstName:"Cliente"},"staff");});
