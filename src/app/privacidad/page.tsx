import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import { pageMetadata, seoPages } from "@/lib/seo";

export const metadata = pageMetadata(seoPages.privacidad);

export default function PrivacidadPage() {
  return (
    <>
      <header className="border-b border-border/70 bg-white">
        <div className="container-site flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.05]">
              <Image
                src="/logo-optica-y-cristal.png"
                alt=""
                width={36}
                height={36}
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className="text-sm font-extrabold text-brand-dark">Óptica y Cristal</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main id="contenido-principal" className="bg-background">
        <article className="container-site section-y max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Protección de datos
          </p>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="mb-10 text-sm text-text-secondary">
            Última actualización: octubre de 2026
          </p>

          <div className="space-y-8 text-base leading-relaxed text-text-secondary">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">1. Responsable del tratamiento</h2>
              <p>
                Óptica y Cristal Chile, con domicilio en Huérfanos 713, local 18, Santiago Centro,
                es responsable del tratamiento de los datos personales que nos entregas al solicitar
                una jornada, un convenio o comunicaciones comerciales autorizadas.
              </p>
              <p>
                Contacto:{" "}
                <a href="mailto:contacto@opticaycristal.cl" className="font-semibold text-primary">
                  contacto@opticaycristal.cl
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">2. Datos que recopilamos</h2>
              <p>
                A través del formulario de solicitud podemos tratar: nombre de la persona
                responsable, cargo, teléfono, correo electrónico, nombre de la empresa, región y mes
                estimado del operativo.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">3. Finalidad</h2>
              <p>
                Usamos estos datos solo para gestionar tu solicitud, contactarte, coordinar la
                jornada oftalmológica y dar seguimiento comercial relacionado con ese requerimiento.
                Las comunicaciones de marketing se envían únicamente con autorización explícita y permiten darse de baja. Cuando interactúas con una campaña, registramos entrega, apertura observada, clic en enlaces y solicitudes para medir y mejorar el seguimiento. Las aperturas y los clics pueden incluir actividad automática. No vendemos tus datos a terceros.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">4. Base legal</h2>
              <p>
                El tratamiento de estas comunicaciones se realiza con tu autorización expresa, conforme a la normativa chilena vigente de protección de datos personales. La Ley 21.719 entra en vigor el 1 de diciembre de 2026. Puedes revocar
                esa autorización en cualquier momento.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">5. Conservación y encargados</h2>
              <p>
                Conservamos la información el tiempo necesario para atender la solicitud y cumplir
                obligaciones legales. Si usamos proveedores de correo o alojamiento, les exigimos
                medidas de seguridad y uso limitado a esta finalidad. El CRM utiliza Neon para almacenamiento y Resend para el envío y los eventos de correo, que pueden tratar información fuera de Chile. No almacenamos la dirección IP del destinatario en las métricas de las campañas. Puedes solicitar información sobre conservación y eliminación en nuestro correo de contacto.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-brand-dark">6. Tus derechos</h2>
              <p>
                Puedes solicitar acceso, rectificación, eliminación, oposición, portabilidad o
                limitación del tratamiento de tus datos escribiendo a{" "}
                <a href="mailto:contacto@opticaycristal.cl" className="font-semibold text-primary">
                  contacto@opticaycristal.cl
                </a>
                . Responderemos dentro de los plazos legales.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
