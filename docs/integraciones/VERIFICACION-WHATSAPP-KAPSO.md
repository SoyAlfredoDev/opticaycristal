# Verificación del WhatsApp del cliente mediante Kapso

## Resultado de la revisión: 3 de noviembre de 2026

El número de la óptica +56 9 2245 2080 está conectado al proyecto «Óptica y Cristal · Atención» en Kapso, con conexión Coexistence y entrada de mensajes habilitada. La consola muestra Payment issue y cero webhooks configurados para ese número. Se ejecutó el chequeo de salud: estado CONNECTED, calidad GREEN, enlace de Kapso con Meta verificado. Persisten avisos de nombre pendiente de aprobación y facturación. El webhook verificado que muestra Health es el enlace Meta-Kapso, distinto de la entrega a nuestra web, que aún no está configurada. No se modificaron facturación, automatizaciones ni destinatarios.

En la web, whatsappVerified existía, pero no había un proceso para probar el control del teléfono. La API privada anterior comprobaba solamente formato y coincidencia con el RUT; eso no verificaba la titularidad.

## Flujo implementado en desarrollo

1. El cliente inicia sesión en Mi cuenta y abre Perfil.
2. Si el servicio está habilitado, pulsa «Verificar por WhatsApp».
3. La web crea un desafío aleatorio de 128 bits, asociado a esa cuenta y su teléfono actual. Caduca en 10 minutos. Solo se almacena una huella HMAC del código.
4. Aparece «Abrir WhatsApp y enviar», con un mensaje preparado: OC-VERIFICAR seguido del código. No contiene RUT, correo, nombre ni importes.
5. El cliente envía ese mensaje a la óptica desde el mismo número registrado. Abrir WhatsApp no verifica la cuenta.
6. Kapso entrega el evento firmado al receptor de la web. Se comprueban firma sobre bytes originales, número de negocio, dirección de entrada, remitente, código, vigencia y fecha del mensaje.
7. En una transacción se registra la recepción, se consume el desafío y se actualiza whatsappVerified. Repetir el evento no crea otro efecto.
8. Perfil consulta el resultado mientras espera y al volver desde WhatsApp; actualiza la cuenta al confirmarse.

Este diseño no inicia un envío automatizado de la óptica ni requiere una plantilla OTP saliente. No modifica el bot Cris ni sus respuestas. Para evitar respuestas innecesarias del bot, se recomienda que su flujo derive o ignore el prefijo OC-VERIFICAR; no se cambió ese flujo externo en esta tarea.

WhatsApp sigue siendo opcional para usar crédito. El correo continúa siendo obligatorio. Verificar WhatsApp no cambia categoría, cupo, correo, deuda ni condiciones de venta.

## Seguridad

- POST /api/clientes/whatsapp exige sesión propia y mismo origen. No acepta userId, RUT, teléfono ni flags desde el formulario.
- GET /api/clientes/whatsapp informa disponibilidad y verificación solo a su titular autenticado.
- Máximo tres desafíos por cuenta por hora y espera mínima de un minuto entre emisiones. Reemitir invalida el código anterior.
- POST /api/integraciones/kapso/webhook requiere X-Webhook-Signature: HMAC SHA256 hexadecimal, sin prefijo sha256=, calculado con KAPSO_WEBHOOK_SECRET sobre el cuerpo sin transformar.
- Solo acepta whatsapp.message.received de KAPSO_PHONE_NUMBER_ID, mensajes de texto inbound/received y un from telefónico válido. Los eventos que solo contienen BSUID no verifican un teléfono.
- Acepta formato v2 individual y lotes de hasta diez mensajes. Se recomienda desactivar buffering para este receptor.
- El timestamp debe corresponder al desafío emitido; se admite desfase de reloj de 30 segundos y se rechazan fechas futuras de más de 60 segundos. El desafío además debe seguir vigente al procesarse.
- Cuerpos limitados a 64 KB; no se guarda el mensaje completo. El recibo contiene huella del identificador de mensaje, cuenta y fecha.
- Se confirma con transacción y deduplicación por mensaje. Si falla el cambio de la cuenta, no se consume el desafío ni se registra la recepción.
- Cambiar el teléfono revoca whatsappVerified y cancela desafíos mediante un trigger. Las ediciones de otros datos conservan el cifrado del teléfono sin alterarlo.
- Respuestas sin caché y errores genéricos; no se muestran datos de una cuenta al emisor del webhook. El receptor falla cerrado si está deshabilitado o falta configuración.

## Activación real pendiente

No se publicó esta implementación ni se creó un webhook en Kapso. Se migró únicamente el esquema de desarrollo.

1. Publicar el código y aplicar sql/integrations/002-whatsapp-verification.sql al esquema de clientes de producción, con la revisión habitual de publicación.
2. Crear un webhook WhatsApp del número 1368248166370894 en Kapso:
   - kind: kapso
   - payload: v2
   - URL: https://opticaycristal.cl/api/integraciones/kapso/webhook
   - evento: whatsapp.message.received
   - buffering: desactivado
   - secret_key: secreto fuerte exclusivo, mínimo 32 caracteres
3. Guardar en el servidor KAPSO_PHONE_NUMBER_ID y el mismo KAPSO_WEBHOOK_SECRET. Este secreto es diferente del token de consulta de crédito y de una clave API de Kapso.
4. Habilitar WHATSAPP_VERIFICATION_ENABLED=true cuando el receptor y la entrega del webhook estén listos. Sin configuración, Perfil informa indisponibilidad temporal y mantiene WhatsApp opcional.
5. Probar con una cuenta y un número expresamente autorizados: enviar el mensaje desde el teléfono, comprobar recepción firmada y confirmación en Perfil; después probar reenvío y teléfono distinto. No se hizo este envío real.

No hace falta incorporar una clave API de Kapso a la web para este flujo receptor. Revisar por separado el aviso Payment issue antes de usar automatizaciones salientes que dependan de la configuración de pago; no se diagnosticó ni modificó el medio de pago.

## Desarrollo

WHATSAPP_VERIFICATION_MIGRATION_TARGET=development node scripts/migrate-whatsapp-verification-dev.mjs

El ejecutor impide producción y usa el esquema de desarrollo existente. Creó oc_client_whatsapp_challenges y oc_client_whatsapp_receipts, más el trigger de invalidación. .env.example contiene la configuración deshabilitada por defecto.

La guía PDF de producción anterior no se modificó: documenta lo que estaba publicado al elaborarla. Esta nueva función sigue en desarrollo hasta su publicación y conexión real.

## Fuentes oficiales

- https://docs.kapso.ai/docs/platform/webhooks/security
- https://docs.kapso.ai/docs/platform/webhooks/message-events
- https://docs.kapso.ai/docs/platform/webhooks/overview

Las pruebas usan mensajes sintéticos y firmas generadas localmente; no equivalen a una entrega real desde Kapso.

## Validación

Suite completa: 618 pruebas aprobadas en 138 archivos, incluidos diez casos de integración de verificación y pruebas de rutas, firma, interfaz y navegación. La disponibilidad viaja en la consulta habitual del portal; no se añade una consulta al entrar a Perfil. Compilación optimizada y TypeScript correctos.

Migración aplicada a oc_customers_preview_20261028: dos tablas y trigger de invalidación. Ningún cliente de producción fue modificado y no se enviaron mensajes de prueba reales.
