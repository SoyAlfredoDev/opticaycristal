# Verificación de WhatsApp del cliente — auditoría y operación

Revisión: 5 de noviembre de 2026. Base: producción `733c584ea8a8061665fa15083a9d8ab5877c45d6`. El refuerzo de seguridad se prepara en una rama aislada; no se publica automáticamente con esta auditoría.

## Qué existe y qué falta

- La versión publicada ya contiene el receptor `/api/integraciones/kapso/webhook`, la API privada de Perfil `/api/clientes/whatsapp` y un desafío aleatorio. La base productiva tiene `oc_client_whatsapp_challenges`, `oc_client_whatsapp_receipts` y `oc_client_registration_limit`; se comprobaron sin leer fichas personales ni modificarlas.
- La comprobación productiva del receptor devolvió HTTP 503 «Servicio no disponible». El código deshabilita el proceso si falta la bandera, el identificador del número o el secreto. La presencia de las tablas no demuestra que el webhook esté conectado.
- Kapso muestra el número de la óptica conectado, un aviso «Payment issue» y ninguna plantilla en su lista. La sincronización desde Meta no se ejecutó: fue rechazada por revisión automática por ser una mutación externa. No se afirma que la cuenta nunca haya tenido plantillas aprobadas.
- Poder responder conversaciones de WhatsApp no equivale a tener una plantilla de autenticación aprobada. No se implementa un código saliente en texto libre fuera de la ventana de atención ni se cambia la facturación para eludir requisitos.
- Se mantiene el flujo de mensaje entrante: evita que un clic en la web provoque miles de envíos de la óptica. Cero llamadas a envío de WhatsApp en este módulo. Esto no configura ni limita por sí solo las respuestas externas del bot Cris.

## Experiencia del cliente

1. Inicia sesión y abre Perfil. El teléfono se resuelve desde su cuenta; el navegador no aporta otro RUT, teléfono, usuario ni bandera de verificación.
2. Pulsa «Verificar por WhatsApp». Se crea un desafío de 128 bits, vinculado a la cuenta y al teléfono registrado, válido por 10 minutos. En la base solo queda su HMAC.
3. Pulsa «Abrir WhatsApp y enviar». El mensaje preparado contiene únicamente `OC-VERIFICAR` y el código. Debe enviarlo desde el mismo número registrado; abrir el enlace no verifica nada.
4. El receptor valida firma, número de negocio, evento de entrada, remitente, código, fecha y vigencia. Solo entonces guarda la verificación y un recibo de auditoría en una transacción.
5. Perfil consulta el resultado con espera progresiva y al volver a la pestaña. No hay sondeo oculto, solicitudes simultáneas ni sondeo indefinido después de vencer el código. Un fallo de red nunca cambia el estado a verificado.

El correo continúa siendo obligatorio para utilizar crédito; WhatsApp sigue siendo opcional. Esta función prueba control del número en ese momento, no identidad civil ni titularidad permanente de la línea. No cambia categoría, cupo, deuda, pagos ni ventas. Cambiar el teléfono cancela desafíos y revoca la verificación mediante el trigger existente.

## Límites del refuerzo

Los límites son de nuestra aplicación, independientes de los de Meta. Persisten en PostgreSQL y funcionan entre instancias del servidor; no dependen de memoria o del botón deshabilitado.

| Operación | Límite |
| --- | --- |
| Generar otro código para la misma cuenta | Espera mínima de 60 segundos |
| Generar códigos por cuenta y por teléfono | 3/hora y 6/24 horas |
| Generar códigos desde una IP | 10/hora y 30/24 horas |
| Generar códigos en toda la aplicación | 120/hora y 500/24 horas |
| Consultar estado autenticado | 30/minuto por cuenta; 120/minuto por IP |
| Procesar mensajes de verificación firmados | 300/minuto global; para candidatos válidos, 10/minuto y 30/hora por número |

Ventanas fijas desde la primera solicitud, no días calendario. Los códigos anteriores quedan inválidos al emitir uno nuevo. Los rechazos de la API privada son HTTP 429 con `Retry-After`; la interfaz espera antes de permitir otro intento. La IP solo es una señal adicional: se agrupa IPv6 por /64 y se siguen aplicando cuenta, teléfono y corte global aunque falte o se falsee una cabecera fuera del proxy confiable.

El receptor acusa recibo sin datos de cuenta y sin responder WhatsApp. El exceso de eventos firmados se descarta con HTTP 200 para no amplificarlo con reintentos del proveedor. Durante una saturación puede ser necesario repetir la verificación después; el límite nunca habilita un número por defecto. Los mensajes desconocidos no crean una fila de límite por cada teléfono arbitrario.

La protección de aplicación no garantiza ausencia de bloqueo de Meta, no sustituye el WAF de la plataforma y no limita conversaciones o automatizaciones ajenas a este receptor. Antes de introducir OTP saliente: plantilla `AUTHENTICATION` aprobada, requisitos de la cuenta comprobados, consentimiento explícito, límites por destino y globales, cupo de gasto, manejo de errores y ninguna repetición ciega ante entrega incierta.

## Protección de datos

- Sesión propia, mismo origen en POST y JSON vacío limitado a 256 bytes. Cambios y verificación siempre se autorizan en servidor.
- HMAC SHA-256 de bytes originales con comparación constante. Se rechazan firmas mal formadas antes de leer el cuerpo. Se admite v2; cuerpo máximo 64 KB y lotes de hasta diez mensajes.
- Solo `whatsapp.message.received` del número de negocio configurado, texto `inbound/received`, teléfono válido y fecha compatible con el desafío. Un BSUID sin teléfono no verifica una línea.
- Códigos de un solo uso, bloqueo de filas, recibo único por huella del mensaje y transacción: si falla la actualización se revierte el consumo. Fechas antiguas o futuras se rechazan antes de consultas costosas.
- RUT y teléfono siguen cifrados; límites usan HMAC. No se guardan códigos, teléfonos ni IP en texto plano en los contadores. El recibo de verificación contiene huella, identificador interno y fecha; no mensaje completo.
- No enviar RUT, saldos, contraseñas o datos de pago en el mensaje de verificación. El mensaje viaja por WhatsApp/Kapso y puede formar parte de su historial normal; no se promete borrarlo de esos servicios.
- Respuestas sin caché privada compartida; errores genéricos, `nosniff` y `no-referrer`. La bandera de entorno permite desactivar el proceso de inmediato en una nueva versión de configuración.
- Revisar y acotar aparte el bot Cris antes de habilitar respuestas de verificación: el prefijo `OC-VERIFICAR` debe excluirse de IA, campañas y seguimientos. Este cambio no debe duplicar la respuesta del bot ni producir una confirmación automática de compra o crédito.

## Activación controlada

1. Revisar/publicar la rama de seguridad sobre la producción vigente. No requiere una migración nueva: reutiliza las tablas existentes.
2. En Kapso, configurar un webhook **del número** +56 9 2245 2080 (`1368248166370894`), tipo Kapso, formato v2, evento `whatsapp.message.received`, sin buffering, URL `https://opticaycristal.cl/api/integraciones/kapso/webhook`. No usar un webhook de eventos de proyecto ni modificar receptores de otros sistemas.
3. Generar y custodiar un secreto exclusivo de al menos 32 caracteres. Guardar el mismo valor solo en Kapso y `KAPSO_WEBHOOK_SECRET` del servidor; además `KAPSO_PHONE_NUMBER_ID`. No confundirlo con el token privado de Cris. El flujo no necesita una clave API de envío en la web.
4. Habilitar `WHATSAPP_VERIFICATION_ENABLED=true` cuando el receptor y la entrega estén configurados. Verificar en una cuenta/número expresamente autorizados, sin marcar manualmente `whatsappVerified` para simular el éxito.
5. Comprobar evento firmado, recibo único y Perfil actualizado; repetir el mismo evento y probar un número diferente. Un HTTP 200 del webhook solo es acuse de recibo, no prueba de verificación.

La prueba local usa componentes y rutas reales con sesión, mensajes y base sintéticos, sin llamadas de envío ni modificaciones de clientes productivos. La prueba real desde el teléfono del cliente y la configuración externa siguen pendientes hasta la activación autorizada.

## Fuentes oficiales consultadas

- Kapso, autenticación: https://docs.kapso.ai/docs/whatsapp/templates/authentication
- Kapso, firmas y secretos: https://docs.kapso.ai/docs/platform/webhooks/security
- Kapso, eventos v2: https://docs.kapso.ai/docs/platform/webhooks/message-events
- Kapso, recepción y reintentos: https://docs.kapso.ai/docs/platform/webhooks/overview
- OWASP, códigos de un solo uso, caducidad y límites: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
