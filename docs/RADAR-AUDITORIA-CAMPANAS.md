# Auditoría de Radar y campañas — 12 de octubre de 2026

## Plan aplicado

1. Revisar búsqueda, datos verificables, deduplicación, CRM, consentimiento y envío.
2. Consultar prácticas de mercado y configuración real de Resend.
3. Crear tres invitaciones, integrar el editor, la vista previa y el contrato para agentes.
4. Corregir el seguimiento y ejecutar pruebas sin enviar a contactos reales.
5. Publicar la interfaz y guardar tres campañas como borradores, sin aprobación ni destinatarios automáticos.

## Resultado técnico

- Radar: fuente OpenStreetMap y enriquecimiento de hasta tres páginas corporativas; pruebas de búsqueda, alcance geográfico, firma de resultados, guardado, identidad y validación de RUT. La información no disponible permanece sin dato; la puntuación es una regla orientativa, no una probabilidad de venta.
- Persistencia: Neon; 94 prospectos existentes. Los contactos encontrados en la web no se convierten automáticamente en suscripciones comerciales.
- Email: SPF, DKIM y tracking verificados en Resend; DMARC público `p=reject`. Webhook habilitado para los nueve eventos de envío, entrega, aperturas, clics y fallos.
- Control: consentimiento con evidencia y fecha, supresión global, bajas sin login, deduplicación de destinatario por campaña, aprobación humana, permiso de envío separado para agentes, idempotencia y límite interno de 50 intentos por día y 5 por ejecución.
- Correcciones: conservar estado enviado cuando falla la reconciliación; registrar `email.failed` en el estado de entrega; impedir que `email.sent` tardío sustituya fallo o cancelación.
- Corrección en búsqueda real: Nominatim ordenaba primero un punto de ciudad para Santiago. Se consultan cinco candidatos y se selecciona el polígono administrativo, sin sustituirlo por una ubicación inventada.
- Formatos: convenio, jornada y presentación de ambas modalidades. HTML de 600 px adaptable, logo oficial, paleta de marca, tipografías con sustitutos compatibles, preencabezado, texto alternativo, versión de texto, CTA principal, privacidad y baja.
- La página de conversión utiliza la navegación y marca de la web, y su mensaje cambia según el objetivo. Registra conversación y tarea comercial; un clic solo no se considera conversación.

## Verificación

- 124 pruebas automatizadas en 32 archivos: búsqueda, guardado, deduplicación, solicitudes, validación, consentimiento, renderer, webhook e idempotencia. Proveedor de envío simulado; ningún correo a contactos reales.
- Revisión visual de los tres formatos en escritorio y móvil: CTA único, logo cargado y sin desbordamiento horizontal.
- La entrega real y la reputación de bandeja requieren un piloto posterior autorizado en una casilla propia; las pruebas simuladas no prueban entregabilidad.

## Pendiente antes del primer envío

- Registrar destinatarios con correo, evidencia y fecha de consentimiento: actualmente hay 0 contactos autorizados en el CRM.
- Revisar y aprobar uno de los borradores, preparar su lista y activar explícitamente `RADAR_MARKETING_ENABLED`. No se habilitó ni ejecutó ningún envío durante esta auditoría.
- Hacer un primer envío controlado a una dirección propia autorizada para verificar entrega real, representación en su cliente de correo, baja, apertura y clic. Las pruebas automatizadas usan proveedor simulado; no acreditan entregabilidad real.

## Operación y experimentos

Resend informa una cuota actual de 100 emails/día y 3.000/mes; el sistema conserva su límite interno más bajo. La cuota incluye los correos transaccionales del mismo proveedor. Revisar consumo antes de cada campaña y evitar lanzar muchas ejecuciones concurrentes.

Primero comparar los tres mensajes usando CTA web. Después mantener el mensaje ganador y comparar web, WhatsApp y correo. Medir conversaciones verificadas, oportunidades y cierres; aperturas y clics son señales orientativas que pueden incluir escáneres o clientes con privacidad. Los enlaces de confianza del footer no cuentan como CTA principal.

El futuro agente puede obtener el catálogo en `GET /api/admin/radar/crm/templates`, crear borradores con `templateId` y revisar los registros paginados. La aprobación requiere sesión administrativa. No hay bot conectado ni envío automático programado. Para búsquedas autónomas se requiere un proveedor Nominatim que autorice automatización y, para volumen o múltiples workers, límites y cola compartidos.

Se alineó la web y su validación con el criterio solicitado: convenio desde 5 trabajadores; jornadas para más de 20. El Radar conserva también empresas menores y sin tamaño conocido para clasificar después.

## Referencias

- [HubSpot: estrategia, segmentación, marca y CTA](https://blog.hubspot.com/marketing/email-marketing-guide).
- [Resend: aperturas y seguimiento de clics](https://resend.com/blog/open-and-click-tracking).
- [Resend: eventos y tratamiento de rebotes](https://github.com/resend/resend-skills/blob/main/skills/resend/references/webhooks.md).
- Manual oficial de Óptica & Cristal consultado en Drive; beneficios contrastados con `src/lib/convenios.ts` y la web actual.
