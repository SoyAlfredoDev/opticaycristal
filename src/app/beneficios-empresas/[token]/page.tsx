import { notFound } from "next/navigation";
import { deliveryByToken } from "@/lib/radar/crm-store";
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
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial",
        color: "#152c40",
      }}
    >
      <p style={{ color: "#6B1F3A", fontWeight: 700 }}>
        ÓPTICA &amp; CRISTAL · EMPRESAS
      </p>
      <h1>Conversemos sobre salud visual para tu equipo</h1>
      <p>
        Evaluaremos un convenio de beneficios ópticos o una jornada en tu
        empresa según la dotación y tus necesidades. Los descuentos, las
        condiciones de pago por nómina y la fecha de una jornada se definen en
        la propuesta.
      </p>
      <section style={{ background: "#f3f7fa", padding: 24, borderRadius: 12 }}>
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
            Quiero conversar sobre un convenio
          </button>
        </form>
      </section>
    </main>
  );
}
