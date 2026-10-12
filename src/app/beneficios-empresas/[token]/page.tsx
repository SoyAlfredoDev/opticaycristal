import { notFound } from "next/navigation";
import { deliveryByToken } from "@/lib/radar/crm-store";
import { SiteShell } from "@/components/site/SiteShell";
import { CONVENIO } from "@/lib/convenios";
export const runtime = "nodejs";
export const metadata = {
  title: "Beneficios ópticos para empresas | Óptica & Cristal",
  robots: { index: false, follow: false },
};
export default async function BenefitsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const d = await deliveryByToken(token);
  if (!d) notFound();
  const jornada = d.objective === "jornada";
  return (
    <SiteShell active={jornada ? "jornadas" : "convenios"}><section
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial",
        color: "#242020",
      }}
    >
      <p style={{ color: "#6B1F3A", fontWeight: 700 }}>
        ÓPTICA &amp; CRISTAL · EMPRESAS
      </p>
      <h1>{jornada ? "Coordinemos una jornada para tu equipo" : "Conversemos sobre beneficios ópticos para tu equipo"}</h1>
      <p>
        {jornada ? "Acercamos la atención visual a empresas con más de 20 trabajadores. Revisaremos participantes, ubicación y fechas para preparar una propuesta con servicios, costos y condiciones." : `Nuestro convenio ofrece ${CONVENIO.discountPercent}% de descuento online y en la óptica, y consulta visual gratuita para trabajadores y familiares. Las cuotas por nómina requieren un contrato con la empresa. También podemos evaluar una jornada en tus instalaciones según la dotación.`}
      </p>
      <section style={{ background: "#FBF7F2", padding: 24, borderRadius: 12, border: "1px solid #E9D8C8" }}>
        <h2>Solicita una conversación</h2>
        <p>
          Cuéntanos qué necesitas. Nuestro equipo dará seguimiento a tu
          solicitud.
        </p>
        <form
          method="post"
          action="/api/radar/conversion"
          style={{ display: "grid", gap: 16 }}
        >
          <input type="hidden" name="token" value={token} />
          <label>
            Tu nombre
            <input
              name="name"
              required
              maxLength={120}
              style={{
                display: "block",
                padding: 12,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </label>
          <label>
            Cargo
            <input
              name="role"
              maxLength={120}
              style={{
                display: "block",
                padding: 12,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </label>
          <label>
            ¿Qué te gustaría coordinar?
            <textarea
              name="message"
              required
              maxLength={2000}
              rows={4}
              style={{
                display: "block",
                padding: 12,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </label>
          <label style={{ display: "none" }}>
            Dejar vacío
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label>
            <input type="checkbox" name="authorization" required /> Autorizo el
            contacto de Óptica &amp; Cristal para responder esta solicitud.
          </label>
          <p style={{ fontSize: 13 }}>
            Usaremos esta información para gestionar tu solicitud y asociarla a
            la campaña que te invitó.{" "}
            <a href="/privacidad">Política de privacidad</a>.
          </p>
          <button
            style={{
              padding: 16,
              background: "#6B1F3A",
              color: "white",
              border: 0,
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            {jornada ? "Solicitar información de una jornada" : "Solicitar una conversación"}
          </button>
        </form>
      </section>
    </section></SiteShell>
  );
}
