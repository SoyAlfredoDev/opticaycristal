import { describe,expect,it } from "vitest";
import { supportEmailContent } from "./support-email";
import { requestedSupportTicket } from "./support-types";
const id="11111111-1111-4111-8111-111111111111";
describe("Avisos corporativos de soporte",()=>{
 it.each(["ticket_created","staff_reply"] as const)("%s conserva marca, datos fiscales y acceso directo sin enlaces de seguimiento",kind=>{
  const mail=supportEmailContent({kind,ticketId:id,folio:"AYU-00001"});expect(mail.html).toContain('lang="es"');expect(mail.html).toContain("cid:logo-opticaycristal");expect(mail.html).toContain("77.068.257-6");expect(mail.html).toContain("Óptica y Cristal Limitada");expect(mail.html).toContain("Huérfanos 713, local 18");expect(mail.html).not.toMatch(/undefined|Enlace válido durante|token=/);expect(mail.text).toContain(`/${kind==="staff_reply"?"mi-cuenta/ingresar":"admin/login"}?ticket=${id}`);expect(mail.text).toContain("iniciar sesión");expect(mail.replyTo).toBe("contacto@opticaycristal.cl");
 });
 it("acepta únicamente identificadores de ticket válidos en los accesos del correo",()=>{expect(requestedSupportTicket(id)).toBe(id);for(const value of [null,undefined,[id],"javascript:alert(1)","../admin"])expect(requestedSupportTicket(value)).toBe("");});
});
