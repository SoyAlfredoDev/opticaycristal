// @vitest-environment node
import {beforeEach,afterEach,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),create:vi.fn(),status:vi.fn()}));
vi.mock("@/lib/clients/auth",()=>({customerSession:m.session}));vi.mock("@/lib/integrations/kapso-verification",()=>({WhatsappVerificationError:class extends Error{},createWhatsappChallenge:m.create,whatsappVerificationStatus:m.status}));
import {GET,POST} from "./route";
const req=(body:unknown={},origin="https://opticaycristal.cl")=>new Request(origin+"/api/clientes/whatsapp",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv("CLIENT_APP_URL","https://opticaycristal.cl");m.session.mockResolvedValue({user:{id:"owner"}});m.create.mockResolvedValue({verified:false,url:"https://wa.me/56922452080"});m.status.mockResolvedValue({available:true,verified:false});});afterEach(()=>vi.unstubAllEnvs());
it("exige sesión y origen, y rechaza identidades aportadas por el navegador",async()=>{m.session.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await POST(req())).status).toBe(401);m.session.mockResolvedValue({user:{id:"owner"}});expect((await POST(req({},"https://external.example"))).status).toBe(403);expect((await POST(req({userId:"other",whatsappVerified:true}))).status).toBe(400);expect(m.create).not.toHaveBeenCalled();});
it("resuelve la cuenta desde su sesión y no permite confirmación desde el frontend",async()=>{expect((await POST(req())).status).toBe(200);expect(m.create).toHaveBeenCalledWith("owner");expect((await GET()).headers.get("cache-control")).toContain("no-store");});
