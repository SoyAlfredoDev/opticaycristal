import { describe, expect, it } from "vitest";
import { correoCliente, correoInterno } from "./templates";
import type { Solicitud } from "@/lib/solicitudes/types";
const request: Solicitud = { id: "test", origen: "convenio", responsable: "Persona", cargo: "RRHH", telefono: "+56912345678", correo: "test@example.com", empresa: "Empresa <script>alert(1)</script>", region: "Metropolitana de Santiago", mesEstimado: "", autorizacionDatos: true, detalles: { trabajadores: 11, comuna: "Santiago", comentarios: "Revisar <b>opciones</b>" }, correoDestino: "team@example.com", correoEstado: "pendiente", correoDetalle: null, correoClienteEstado: "pendiente", correoClienteDetalle: null, creadoEn: new Date().toISOString() };
describe("correos de las nuevas solicitudes", () => {
  it("incluye la modalidad de convenio elegida en ambos correos", () => {
    const withInterest: Solicitud = { ...request, detalles: { ...request.detalles, modalidadConvenio: "financiamiento" } };
    for (const email of [correoCliente(withInterest), correoInterno(withInterest)]) expect(email.text).toContain("Interés del convenio: Descuento y financiamiento por nómina");
  });
  it("identifica convenios y mantiene los datos adicionales", () => {
    const client = correoCliente(request); const internal = correoInterno(request);
    expect(client.subject).toContain("convenio"); expect(client.text).not.toContain("48 horas");
    expect(internal.text).toContain("Trabajadores / participantes: 11"); expect(internal.text).toContain("Comuna: Santiago");
  });
  it("escapa contenido del cliente en HTML", () => {
    for (const email of [correoCliente(request), correoInterno(request)]) { expect(email.html).not.toContain("<script>"); expect(email.html).not.toContain("<b>opciones</b>"); expect(email.html).toContain("&lt;"); }
  });
  it("distingue convenio y jornada con financiamiento opcional y marca oficial", () => {
    const convenio = correoCliente(request), jornada = correoCliente({ ...request, origen: "jornada" });
    expect(convenio.text).toContain("20%"); expect(jornada.text).toContain("30%");
    for (const email of [convenio, jornada]) {
      expect(email.text).toContain("opcional y requiere acuerdo y contrato");
      expect(email.html).toContain("#6B1F3A"); expect(email.html).not.toContain("#b21f24");
      expect(email.html).toContain('lang="es"'); expect(email.replyTo).toBe("contacto@opticaycristal.cl");
    }
    expect(correoInterno(request).replyTo).toBe(request.correo);
  });
});
