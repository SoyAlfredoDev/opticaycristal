# Integración comercial — 13 octubre 2026

Objetivo: obtener correos comerciales reales, preparar campañas con pocos pasos y entregar conversaciones al ejecutivo.

1. Datos: conservar empresas y contactos existentes; añadir relación comercial, disponibilidad de marketing y seguimientos persistentes.
2. Captación: búsqueda con consulta de webs, evidencias y caché; importación Excel/CSV con vista previa, errores y duplicados; plantilla Excel sin contactos ficticios.
3. Operación: navegación Dashboard, Radar, Clientes, Campañas y Seguimientos; KPIs consultados en PostgreSQL, tabla de clientes y bandeja del ejecutivo.
4. Campañas: dos propuestas mensuales para jornadas, CTA principal hacia la web, destinatarios por segmento, aprobación del contenido, programación y límite de frecuencia.
5. Respuestas: Reply-To por entrega; webhook firmado de Resend, correlación, revisión de autenticación, mensajes como texto sin ejecutar instrucciones y tarea comercial.
6. Verificación: pruebas de segmentación, bajas, importación, deduplicación y respuestas; TypeScript/lint y comprobación web. Sin envíos de pruebas a prospectos reales.

La captación crea contactos automáticamente. Una acción del ejecutivo confirma la llamada antes de habilitar marketing; los respaldos permanecen en el sistema interno de la empresa. Una apertura no acredita lectura ni interés. Rebotes permanentes se excluyen, conservando historial para no reimportarlos.

La automatización se configura mediante CRON_SECRET, RADAR_INBOUND_DOMAIN, RADAR_INBOUND_READY y RESEND_RECEIVING_API_KEY. Requiere recibir email.received en Resend y verificar el MX del subdominio. El trabajo programado respeta RADAR_MARKETING_ENABLED.

## Resultado de la integración

- 65 pruebas unitarias aprobadas; TypeScript, ESLint y compilación de producción correctos. Consulta de segmentación validada con EXPLAIN en Neon, sin ejecutar el INSERT.
- Consulta real del Dashboard: 1.893 empresas, 4 emails únicos y 0 destinatarios habilitados; la fuente pública no garantiza publicar correo para todas las empresas.
- Dos borradores de octubre guardados: invitación a la jornada y seguimiento para abrir una conversación. Se revisan y aprueban desde Campañas.
- Resend: subdominio respuestas.opticaycristal.cl verificado, MX y DKIM verificados, webhook existente con email.received. Clave de recepción Full access separada, guardada como secreto en Vercel con autorización del propietario; clave anterior conservada por su instrucción.
- CRON_SECRET configurado y recepción activada. El envío automático permanece pausado; no se enviaron pruebas a prospectos ni se simularon respuestas reales.
- Corregidos el tratamiento de HTML recibido de Resend, la reactivación de contactos pausados al iniciar el servidor, la deduplicación de filas inválidas y el envío nativo del formulario de acceso para evitar contraseñas en URLs.

Referencia técnica: [datos y autenticación del correo recibido en Resend](https://resend.com/docs/api-reference/emails/retrieve-received-email). Una respuesta autenticada se vincula al destinatario y crea seguimiento; las automáticas o no verificadas se clasifican para revisión, sin ejecutar instrucciones del mensaje.
