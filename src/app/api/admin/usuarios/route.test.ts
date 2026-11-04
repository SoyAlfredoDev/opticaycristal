// @vitest-environment node
import {beforeEach,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),invite:vi.fn(),list:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSession:mocks.session}));
vi.mock("@/lib/staff/users",()=>({StaffError:class extends Error{},listStaffUsers:mocks.list,inviteStaffUser:mocks.invite,cancelStaffInvitation:vi.fn(),changeStaffStatus:vi.fn()}));
import {GET,POST} from "./route";
beforeEach(()=>{vi.stubEnv("CLIENT_APP_URL","https://opticaycristal.cl");mocks.session.mockResolvedValue({u:"owner"});mocks.list.mockResolvedValue({users:[]});mocks.invite.mockResolvedValue({mailStatus:"accepted"});});
const request=(origin="https://opticaycristal.cl",body:unknown={action:"invite"})=>new Request("https://opticaycristal.cl/api/admin/usuarios",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
it("rechaza visitantes y sesiones de cliente sin autorización administrativa",async()=>{mocks.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(request())).status).toBe(401);});
it("exige mismo origen y no acepta JSON inválido",async()=>{expect((await POST(request("https://ajeno.example"))).status).toBe(403);expect((await POST(request(undefined,null))).status).toBe(400);expect(mocks.invite).not.toHaveBeenCalled();});
it("usa el actor de la sesión y nunca el enviado en la solicitud",async()=>{expect((await POST(request(undefined,{action:"invite",actor:{u:"fake"}}))).status).toBe(200);expect(mocks.invite.mock.calls[0][1]).toEqual({u:"owner"});expect((await GET()).headers.get("cache-control")).toContain("no-store");});
