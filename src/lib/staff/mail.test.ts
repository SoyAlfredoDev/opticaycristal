// @vitest-environment node
import {it,expect,vi} from "vitest";
vi.mock("@/lib/mail/resend",()=>({enviarConResend:vi.fn()}));
import {staffInvitationEmail} from "./mail";
it("incluye identidad corporativa, logo, invitación individual y caducidad",()=>{const result=staffInvitationEmail("https://opticaycristal.cl/admin/registro#token="+"a".repeat(64));expect(result.html).toContain("Crear mi acceso");expect(result.html).toContain("24 horas");expect(result.html).toContain("cid:");expect(result.html).toContain("local 18");expect(result.text).toContain("integrante del equipo");expect(result.text).toContain("un solo uso");expect(result.html).toContain("#token=");});
