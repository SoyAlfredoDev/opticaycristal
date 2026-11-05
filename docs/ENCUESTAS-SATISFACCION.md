# Encuestas de satisfacción — plan y operación

1. Una invitación por venta nueva a crédito, creada dentro de la misma transacción mediante trigger. No rellenar ventas históricas. Entrega programada para el siguiente día calendario de Santiago mediante tarea diaria 15:00 UTC (11:00/12:00 Chile). Cancelaciones anteriores al envío se omiten.
2. Correo corporativo existente, token aleatorio de 256 bits cifrado y hash de búsqueda; vence a 30 días del envío. Pixel con token separado: apertura aproximada, independiente de visita y respuesta. No cambiar seguimiento global de otros correos.
3. Web sin registro: atención (1–5), plataforma (1–5 o «Aún no la he usado») y calidad del lente/producto (1–5 o «Aún no lo he recibido/probado»). Comentario opcional de sugerencia/reclamo, máximo 2000 caracteres. Un envío por invitación; reintentos idénticos idempotentes.
4. Vista administrativa con indicadores, promedios que excluyen «no usado», comentarios y paginación. Respuesta y notificación se guardan atómicamente en la bandeja existente. Sin notificaciones externas adicionales.
5. Pruebas aisladas del calendario, cola, proveedor simulado, token, formulario, validación, duplicados, notificación y permisos. No enviar a clientes reales en las pruebas.

Activación: migración 024, configuración `CLIENT_SURVEYS_ENABLED=true` y `CRON_SECRET` existente. Preparar revisión sin activar envíos ni migrar producción en esta tarea. Una aceptación del proveedor no garantiza bandeja de entrada; un pixel puede ser bloqueado o precargado. Enlace visitado también puede provenir de un filtro automático.

## Configuración y límites

- Migrar con `SURVEY_MIGRATION_CONFIRM=024 node scripts/migrate-surveys.mjs`, usando conexión directa y esquema explícito de clientes, previa revisión. Script preparado; no ejecutado sobre producción.
- `CLIENT_SURVEYS_ENABLED=false` de forma predeterminada. No se cambian las variables reales de Vercel.
- `CRON_SECRET`, `RESEND_API_KEY`, `CLIENT_APP_URL`, `CLIENT_DATA_KEY` y conexión de clientes son los existentes; no se introducen claves públicas ni sesiones de administrador en el enlace.
- Tarea diaria: hasta 50 invitaciones y ventana de 40 segundos por ejecución. Si la cola crece o el proveedor falla, debe revisarse y dimensionarse el planificador; no se promete entrega exacta ni bandeja de entrada. Los envíos inciertos conservan token y clave de idempotencia del proveedor; después de 22 horas quedan para revisión, evitando reenvíos ciegos fuera de su ventana segura.
- No se amplía el seguimiento global del dominio Resend. Solo esta encuesta añade un pixel propio con token distinto, documentado en el correo. Aperturas y visitas son señales aproximadas; la respuesta explícita es el registro concluyente.
- Comentarios y secretos del enlace cifrados en reposo; puntuaciones disponibles para agregación. El panel requiere administrador, no vendedor. El enlace no devuelve identidad, precio, RUT, deuda ni respuestas anteriores.
- Rutas: `/encuesta/[token]`, `/api/encuestas/[token]`, `/api/encuestas/apertura/[token]`, `/admin/encuestas`, `/api/admin/encuestas`, `/api/cron/encuestas`. POST público valida mismo origen, JSON acotado y límites por token/IP; cron usa secreto con comparación constante. Páginas personales sin indexación y con política de referencia privada.

## Verificación

Suite completa: 656 pruebas (19 nuevas), TypeScript, ESLint y build de Next.js. Migración aplicada dos veces en PostgreSQL aislado. Flujo probado con proveedor simulado, sin correo real ni datos productivos: venta → programación → envío → enlace/pixel → respuesta → comentario cifrado → notificación administrativa.

Revisión visual con los componentes reales y API sintética en navegador, escritorio y móvil 390 px: tres preguntas, opciones «aún no», envío, agradecimiento y vista administrativa; sin desbordamiento horizontal. Estas capturas no corresponden a una cuenta productiva. La recepción real de un email queda pendiente de una prueba controlada tras desplegar.
