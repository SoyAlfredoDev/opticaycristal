# Contrato de consumo de Cris — revisión 1.1

Fecha: 4 de noviembre de 2026. Destinatario: chat que conecta el adaptador confiable de Kapso. **Documento de revisión; no conectar las capacidades nuevas todavía.** Contrato formal: [openapi-cris.json](./openapi-cris.json). Contiene 17 rutas reales, 50 esquemas, ejemplos de entrada/salida y errores.

## Estado y reconciliación de fuentes

| Entorno | Estado comprobado |
|---|---|
| Producción | Base `fbff703a7adc21ffc7d3b1aedbf0e8f7b607d0dd`, rama `codex/staff-users-release-20261104`; Vercel `dpl_37k9Ah67Ck8j6FQcG2rMBVX3tYGY`, Production READY, verificado al publicar Usuarios en este chat. URL canónica https://opticaycristal.cl. |
| Contrato productivo de Cris | Se conserva el código de `12a101b269b0b849b1ccd80a4ff14dc6ebf23628`, incluido en la base publicada, con `consultar-condiciones`, `consultar-credito`, `validar-whatsapp`. La auditoría adjunta aporta una lectura positiva de condiciones desde Kapso; no aporta una consulta personal positiva de crédito. |
| Revisión local | Rama aislada `codex/cris-api-review-20261104`, basada en `fbff703`. El commit de implementación y evidencia final se identifican en `API-CRIS-ESTADO.json`, entregado junto al documento. |
| Preview nueva | No creada; no se ha hecho push de esta revisión. |
| Producción nueva | No publicada; migración 003 no aplicada, flag desactivado. No se han creado tickets, adjuntos, pagos, clientes ni seguimientos reales. |

La carpeta principal antigua permanecía en `0f7029e` con modificaciones pendientes y no contenía `consultar-condiciones`. La revisión se creó desde la fuente publicada y conserva ambas APIs actuales, la verificación Kapso y Usuarios. No se reemplazó la carpeta principal ni se incluyeron los cambios pendientes de contratos/web. Para integrar, revisar esta rama/patch sobre la versión productiva vigente; no publicar la carpeta principal antigua completa.

Una respuesta 401 sin token acredita existencia/protección HTTP, no una consulta financiera positiva. No se utilizaron credenciales personales, sesiones administrativas compartidas ni datos reales para las pruebas nuevas.

## Rutas existentes y transición de seguridad

Base: `https://opticaycristal.cl/api/integraciones/v1/whatsapp`.

| POST | Entrada | Resultado |
|---|---|---|
| `/consultar-condiciones` | `{}` | Moneda CLP, categorías y requisitos de pie/compra presencial. Sin datos personales. |
| `/consultar-credito` | `{rut, whatsapp}` | Categoría, capacidad, monto habilitado y coincidencia del remitente. |
| `/validar-whatsapp` | `{rut, whatsapp}` | Coincidencia del número registrado; no comprueba cuenta activa en Meta. |

Bearer existente, verificado por SHA-256 en `WHATSAPP_API_TOKEN_HASHES`. Se conservan motivos `AVAILABLE`, `EMAIL_VERIFICATION_REQUIRED`, `ACTIVE_CREDIT`, `NO_AVAILABLE_CREDIT`; `capacity` no equivale a `usableNow` ni a saldo de deuda. Requisitos: correo verificado para usar crédito; WhatsApp opcional; cédula y compromiso presenciales. RUT chileno solamente. No actualizar automáticamente el documento a pasaporte.

No se exige la nueva firma ni se añaden scopes a los consumidores actuales. No se ha cambiado el comportamiento de sus errores, paginación, tamaño o límites.

Las consultas personales antiguas devuelven `403 SIGNED_ROUTE_REQUIRED` por defecto. Sustituirlas por `POST /api/integraciones/v1/cris/consultar-credito` y `POST /api/integraciones/v1/cris/validar-whatsapp`: ambas usan `finance:read`, el esquema `IdentityRequest` y la firma descrita abajo. El campo `data` conserva el significado y la estructura anterior. `consultar-condiciones` se mantiene con el token anterior y sin datos personales.

Si la migración del adaptador no está lista, conservar temporalmente `WHATSAPP_LEGACY_PERSONAL_ENABLED=true` al publicar, comprobar el remitente firmado en Kapso y retirarla enseguida. La configuración nueva no se ha aplicado a producción.

## Rutas firmadas

Base local sugerida: `http://localhost:3048/api/integraciones/v1/cris`. Misma base canónica en producción únicamente después de revisión, migración y despliegue. Todas usan POST y JSON; nunca poner datos personales o tokens en URL.

| Acción | Scope | Campos adicionales a identidad | Datos devueltos / alcance |
|---|---|---|---|
| `consultar-credito` / `validar-whatsapp` | `finance:read` | Ninguno | Cupo y categoría, o coincidencia del número, con firma del remitente. |
| `consultar-resumen` | `finance:read` | Ninguno | Capital pendiente, capital vencido, fecha impaga más antigua y capacidad/habilitación actual. No suma mora. |
| `consultar-cuotas` | `finance:read` | `cursor?` | Ventas con crédito, cuotas, vencimientos y capital pagado/restante; incluye estado activa/anulada. |
| `consultar-saldo` | `finance:read` | `saleId` | Capital, mora y total de una venta activa propia, calculados por la lógica del compromiso existente. |
| `consultar-pagos` | `finance:read` | `saleId`, `cursor?` | Pagos registrados, capital/interés, condonación, fecha y reversión. Sin referencias bancarias ni autor administrativo. |
| `consultar-ot` | `orders:read` | Ninguno | **Solo rechazo seguro 503 `SOURCE_NOT_CONFIGURED`. No hay fuente de OT vinculada.** |
| `consultar-comercial` | `commercial:read` | Body `{}`; sin identidad ni firma contextual | Información publicada, versionada y campos pendientes explícitos. |
| `consultar-tickets` | `tickets:read` | `ticketId?`, `offset?`, `messageOffset?` | Tickets propios, o una página de la conversación propia. |
| `crear-ticket` | `tickets:write` | `subject`, `message`, `consent:true`, `attachmentIds?` | Ticket en Soporte y recibo PENDING_REVIEW. |
| `registrar-solicitud` | `requests:write` | Anteriores + `kind` | `evaluacion`, `jornada` o `convenio`, recibidos en Soporte para derivación humana. |
| `avisar-comprobante` | `requests:write` | Como crear-ticket | Aviso PENDING_REVIEW. Nunca registra un pago ni cambia capital, mora o cuota. |
| `consultar-solicitudes` | `requests:read` | `requestId?`, `offset?` | Recibos propios y estado real de su ticket. |
| `recibir-adjunto` | `attachments:write` | `mime`, `contentBase64` | Identificador privado, tamaño y vencimiento. No URL pública. |

Los identificadores de compra, ticket, recibo y adjunto se obtienen de las respuestas del servidor. El modelo no puede elegir un `customerId`; cualquier campo extra se rechaza. No hay endpoints de registro contable, crédito, categorías, edición de identidad, aprobación, reserva ni seguimiento.

Los trabajadores revisan las recepciones en la bandeja de **Soporte** existente. Las solicitudes de empresas de Cris son solicitudes de revisión, no altas confirmadas del formulario de empresas ni contratos. Un interesado sin cuenta vinculable debe derivarse al humano/formulario existente; esta fase no crea clientes anónimos ni los registra implícitamente.

## Identidad y prueba del remitente

Toda acción nueva salvo comercial exige este objeto:

```json
{"document":{"type":"RUT","number":"12.345.678-5"},"sender":{"source":"kapso","whatsapp":"+56912345678","messageId":"wamid.synthetic-only"}}
```

Ejemplo sintético: no enviarlo a producción como si fuera un cliente real. El RUT procede del usuario, pero el remitente y `messageId` deben salir del evento de WhatsApp validado por el adaptador privado de Kapso. Nunca tomar el teléfono del mensaje, parámetros de una herramienta del modelo, variables generadas por la IA o un `customerId` solicitado por ella.

La coincidencia se hace con el teléfono descifrado del registro del mismo RUT. RUT inexistente y teléfono no coincidente producen el mismo 404 `CONTACT_NOT_MATCHED`. El resultado no afirma que el teléfono tenga una cuenta activa ni modifica verificaciones. Para usar un documento distinto de RUT falta un contrato y fuente de identidad explícitos; respuesta actual `UNSUPPORTED_DOCUMENT`.

Además del bearer, el adaptador firma **los bytes exactos JSON** con un secreto independiente:

```text
X-Cris-Timestamp: epoch en segundos (10 dígitos)
X-Cris-Nonce: aleatorio base64url, 22–128 caracteres
X-Cris-Signature: HMAC-SHA256 hexadecimal minúsculo de:
  timestamp + "\n" + nonce + "\n" + "POST" + "\n" + pathname + "\n" + sha256(rawBody)
```

Sin salto final. `pathname` incluye `/api/integraciones/v1/cris/ACCION`, sin dominio ni query. Tolerancia ±300 segundos; reloj sincronizado. Nonce de un uso almacenado durante al menos 10 minutos. Un reintento usa nuevo timestamp/nonce/firma, conservando body y clave de idempotencia. La firma autentica al **adaptador confiable**, no consulta Meta por cada petición: validar autenticidad del evento de entrada en Kapso sigue siendo responsabilidad del conector. No entregar ninguno de los dos secretos a la IA.

## Credenciales y provisión

`CRIS_API_ENABLED=false` por defecto. Configuración nueva de servidor `CRIS_API_KEYS_JSON`: array de `{id, tokenHash, scopes, senderSigningSecret?}`. `id`: 3–32 caracteres `[a-z0-9_-]`; `tokenHash`: SHA-256 hexadecimal de 64 caracteres; bearer y secreto de firma: valores aleatorios base64url de 43–128 caracteres. IDs o hashes duplicados, hashes/scopes malformados o configuración ausente cierran con 503. El secreto de firma es obligatorio para acciones personales y recepción.

Generar credenciales con un generador criptográfico y provisionarlas por el gestor privado de secretos de cada entorno. Guardar solo el hash del bearer en la óptica; el bearer original y el secreto de firma viven en el adaptador de Kapso. No reutilizar el token legacy. Crear credenciales de lectura y recepción separadas y solo los scopes necesarios. Para rotar: añadir nueva entrada con nuevo `id`, actualizar Kapso y comprobarla; retirar la anterior tras confirmar. Las claves de idempotencia pertenecen a un `keyId`: conciliar operaciones pendientes antes de retirarlo, no reenviar escrituras antiguas bajo otra clave.

Nunca compartir cookies de personal con Cris. `Origin` se rechaza; HTTPS obligatorio en producción. Sin CORS de navegador, sin redirects con credenciales. Los ejemplos no incluyen secretos reales ni los imprimen.

## Esquemas y significado de los datos

El OpenAPI es la definición completa de propiedades, enums, nulabilidad y ejemplos. Respuestas nuevas:

```json
{"data":{},"requestId":"10000000-0000-4000-8000-000000000001","queriedAt":"2026-11-04T12:00:00.000Z","apiVersion":"1.1"}
```

`data` tiene el esquema específico de la acción; no es un objeto libre. Errores:

```json
{"error":{"code":"CONTACT_NOT_MATCHED","message":"No pudimos vincular estos datos. Contacta a la óptica."},"requestId":"10000000-0000-4000-8000-000000000001"}
```

CLP siempre entero, sin decimales. `asOf`, vencimientos y fechas de pago: `YYYY-MM-DD`, según reglas existentes en `America/Santiago`; instantes UTC ISO-8601. `null` significa dato ausente, nunca cero ni confirmación negativa. `principalOutstanding` se lee del saldo del sistema; `overduePrincipal` solo suma capital impago con fecha anterior a hoy. `nextUnpaidDueDate` es la fecha impaga más antigua y puede estar vencida. `consultar-saldo` reutiliza `saleInterestQuote` y el compromiso almacenado, sin alterar su política ni inventar tasas. `contractAnnualLateRate` identifica la tasa configurada en el compromiso; no afirma que esté aplicada (por ejemplo, una compra sin firma puede tener mora calculada cero). Para un monto exigible usar los importes calculados y revisión humana, no multiplicar la tasa en Cris. El resumen no incluye mora; para el total de una compra consultar saldo.

En cuotas, usar `status` para distinguir anulaciones; no sumar cuotas de una venta anulada como deuda activa. Los pagos con `reversed:true` son registros históricos revertidos: no sumarlos como dinero vigente. La referencia bancaria, datos del banco, documentos firmados y firma del representante no se exponen.

## Paginación y límites

- Cuotas: 10 ventas por página con cursor opaco `nextCursor`; hasta las cuotas ya existentes de cada venta. Pagos: 10 por venta. Enviar cursor de respuesta o terminar cuando sea null; no fabricarlo ni usarlo para cambiar de propietario.
- Tickets: 50 por página, `offset` inicial 0 y `nextOffset`. Conversación: `ticketId` y `messageOffset`, 50 mensajes por página con `nextMessageOffset`. Si se proporciona ticketId, el offset de lista no se utiliza. Solicitudes: 20 por página, mismo mecanismo nextOffset. Offset máximo 10000. En listas modificadas concurrentemente los offsets pueden desplazarse; deduplicar por ID.
- Clave: 60 peticiones/minuto. Contacto: 10 intentos por RUT/clave cada 15 minutos. Límites persistentes reutilizados. 429 incluye `Retry-After: 900`, conservador también para el límite de minuto.
- Soporte conserva sus límites: 5 tickets/hora, 10 abiertos y 20 mensajes/hora por cliente. La API de Cris no los evita.
- JSON ordinario máximo 8192 bytes. Upload máximo 1.450.000 bytes JSON y 1.048.576 bytes de archivo. Texto asunto 1–80 caracteres; mensaje 1–1700; sin caracteres de control. `sender.messageId` hasta 200. Campos desconocidos rechazados.
- No hay búsquedas generales de clientes, montos ni documentos por parte del modelo.

## Idempotencia, errores y reintentos

Las cuatro recepciones requieren `Idempotency-Key: [A-Za-z0-9_-]{16,128}`. Mantener la misma clave y los mismos bytes JSON, incluido el `messageId` original, hasta obtener resultado. Primera recepción: 201 y `replayed:false`; repetición: 200, mismo identificador y `replayed:true`. Cambio de contenido con la misma clave: 409. La clave se registra por credencial; la propiedad y la vinculación de adjuntos se comprueban dentro de la transacción. Un adjunto no puede reutilizarse en otro ticket. Las huellas de idempotencia de solicitudes se conservan hasta revisión de una política de retención; no se reciclan automáticamente. La idempotencia de uploads dura mientras exista su fila: tras vencimiento devuelve 410, y tras purga física no se conserva esa clave. No reintentar un upload antiguo después de su retención; iniciar una carga nueva con consentimiento y clave nueva.

| HTTP / código | Acción del adaptador |
|---|---|
| 400 `HTTPS_REQUIRED`, `INVALID_INPUT`, `INVALID_RUT`, `INVALID_WHATSAPP`, `INVALID_CURSOR`, `UNSUPPORTED_DOCUMENT`, `CONSENT_REQUIRED`, `IDEMPOTENCY_REQUIRED` | Corregir entrada o derivar documento no soportado. No repetir ciegamente. |
| 401 `UNAUTHORIZED` | Revisar/rotar bearer. No pedir al cliente que envíe credenciales. |
| 403 `SCOPE_REQUIRED`, `SERVER_ONLY`, `SENDER_PROOF_REQUIRED`, `INVALID_SENDER_PROOF` | Corregir configuración/contexto del adaptador. |
| 404 `CONTACT_NOT_MATCHED`, `RESOURCE_NOT_FOUND`, `NOT_FOUND` | Mensaje no enumerable; ofrecer revisión humana. |
| 409 `REPLAY_DETECTED` | Nueva prueba de remitente; conservar idempotencia del negocio. |
| 409 `IDEMPOTENCY_CONFLICT` | Detener y conciliar con humano; no inventar otra clave para forzar duplicado. |
| 410 `ATTACHMENT_EXPIRED` | Nueva carga privada si el cliente mantiene su consentimiento. |
| 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA_TYPE`, 400 `INVALID_ATTACHMENT` | Reducir/corregir archivo; no descargar enlaces alternativos arbitrarios. |
| 429 `RATE_LIMITED` / `ATTACHMENT_LIMIT` | Respetar Retry-After, jitter y límite global; para ATTACHMENT_LIMIT derivar al equipo, sin bucle de cargas. |
| 503 `NOT_CONFIGURED`, `COMMERCIAL_NOT_APPROVED`, `SOURCE_NOT_CONFIGURED` | Capacidad pendiente/configuración/fuente que requiere revisión; no completar respuesta con una invención. |
| 503 `UNAVAILABLE`, fallo de red, timeout o respuesta no JSON | Hasta dos reintentos con espera exponencial y jitter. En escrituras mantener idempotencia y body. Si persiste, informar “no pude confirmar la recepción” y derivar. |

Timeout del cliente de ejemplo: **20 segundos provisionalmente**, sin redirects. La función nueva declara `maxDuration=30`; sus transacciones de recepción usan statement timeout de 4 segundos y lock timeout de 3. Las lecturas reutilizan el pool actual (hasta 8 segundos de conexión). **No se ha medido p95 ni arranque en frío contra producción**, ni se garantiza que todas las lecturas respondan en 7 segundos. El timeout de 7 segundos del adaptador actual debe revisarse antes de conectar estas capacidades. Un timeout no prueba que una escritura haya fallado: conciliar mediante el mismo Idempotency-Key.

Guardar para diagnóstico solamente HTTP, código saneado, requestId y duración. Se devuelven `X-Request-ID`, `Server-Timing` y fecha de consulta. Auditoría persistida: keyId técnico, acción, resultado, HTTP, duración y hora; sin RUT, teléfono, correo, saldo, contenido de mensaje, token o firma. No registrar request/response completos en Kapso, Vercel, APM, traces o capturas.

## Adjuntos y revisión humana

Secuencia: `recibir-adjunto` → id privado → incluirlo en `attachmentIds` al crear ticket/solicitud/aviso → recibo PENDING_REVIEW. Límite de almacenamiento: veinte adjuntos vigentes por cliente, compartido entre credenciales; `ATTACHMENT_LIMIT` requiere revisión humana. Cada recepción enlaza como máximo tres adjuntos del mismo cliente y credencial. Una carga suelta no es un comprobante recibido en Soporte ni es visible para descarga administrativa hasta vincularla.

Se aceptan JPEG, PNG y PDF de hasta 1 MiB. Se comprueba firma de bytes y base64 canónico; **esto no sustituye antivirus**. Todos quedan `UNSCANNED`. No hay OCR, evaluación de autenticidad ni procesamiento por IA. No se descargan URLs suministradas por el cliente; Kapso debe entregar bytes desde su servicio de medios autorizado, verificando su origen, sin reenvío de URLs arbitrarias a esta API. El conector de medios de Kapso sigue pendiente de configurar/revisar.

El archivo se almacena cifrado AES-GCM mediante la protección ya existente y propósito independiente, sin nombre original ni URL pública. Vence a los 30 días y se deniega su lectura vencida. La eliminación física necesita ejecutar el mantenimiento explícito `scripts/purge-cris-expired.mjs`; **no se activó un cron**, por lo que no se afirma eliminación automática al día 30. Falta aprobar/operar el calendario de limpieza y política de conservación; ejecutar mantenimiento solo después de revisión del entorno y autorización.

Los administradores ven el aviso en Soporte y un bloque de recepción con descarga manual. Rutas internas implementadas: GET `/api/admin/integraciones/cris/tickets/{id}` y GET `/api/admin/integraciones/cris/adjuntos/{id}`. Exigen sesión administrativa y verifican vínculo/expiración; bearer de Cris no permite descargar. Respuesta como attachment, CSP sandbox, nosniff, no-store. No adjuntar estos archivos a correos ni enviarlos al modelo. Revisar archivos no analizados solo en un entorno seguro. Falta integrar análisis de malware; no se afirma que un PDF/imagen sea inocuo.

No se han activado notificaciones salientes de estas recepciones: reutilizan Soporte con notificación de creación desactivada para este adaptador. La respuesta manual posterior del personal conserva el flujo de Soporte existente. Recibir un comprobante no ejecuta `recordSalePayment`, no acredita pago, no condona ni cambia saldo.

## Información comercial y OT: límites comprobados

Versión inicial comercial: `public-fbff703-68400f58d344e847`, ligada por hash completo a las fuentes existentes. Si cambia ese contenido sin revisar la huella, la consulta cierra con `COMMERCIAL_NOT_APPROVED`. No hay un editor público ni actualización generada por IA.

Se reutilizan dirección completa (Local 18), contacto, horario semanal publicado y `CONVENIO`/FAQs de la web. Se conserva que el descuento de convenio es para empresas registradas, con cuotas por nómina opcionales sujetas a acuerdo; no se transforma en promoción general. No hay vigencia fechada documentada: effectiveFrom/effectiveUntil son null y la fuente es el contenido público vigente, no una nueva campaña aprobada en este chat.

No encontré una fuente canónica versionada de precios desde, promociones temporales, condiciones detalladas de garantía, plazos de entrega, cobertura/costo de despacho o calendario de excepciones. Se devuelven null y sus nombres en pending. No deducir “abierto ahora” con un calendario incompleto, ni afirmar cierre dominical, feriados, entrega el mismo día o precios orientativos.

`src/lib/orders` guarda pedidos comerciales con estados `nuevo`, `contactado`, `cotizado`, `cerrado`, contacto y productos; no tiene relación verificada con identidad cliente, etapas de laboratorio, fecha comprometida ni bandera de retiro. Una venta/compromiso tampoco acredita fabricación/entrega. Por eso consultar-ot no devuelve ready=false ni ready=true: falta la fuente real. Para completar: identificar sistema de OT, identificador estable, vínculo de propietario, estados y responsable que confirma listo/entregado; entonces definir un adaptador y nuevos casos de prueba.

## Ejemplos fetch y curl (sintéticos, solo servidor)

Archivos utilizables en `examples/`. Las variables `CRIS_API_TOKEN` y `CRIS_SENDER_SIGNING_SECRET` se provisionan en el entorno privado del adaptador; nunca se escriben en ejemplos o mensajes. No usar console.log del resultado financiero.

```js
import {crisPost} from './examples/cris-client.mjs';
// En el adaptador, estos datos vienen del evento verificado y la conversación del cliente.
const identity = {document:{type:'RUT',number:'12.345.678-5'},
  sender:{source:'kapso',whatsapp:'+56912345678',messageId:'wamid.synthetic-only'}};
const response = await crisPost('consultar-resumen', identity);
// Formatear response.data en una plantilla determinista del servidor; no entregarlo al LLM.
```

```js
const request = {...identity, subject:'Solicitud sintética',
  message:'Solicito revisión, sin confirmar fecha ni pago.', consent:true};
const receipt = await crisPost('crear-ticket',request,{idempotencyKey:crypto.randomUUID()});
// Guardar esta clave antes de enviar y reutilizarla al reintentar los mismos datos.
```

El wrapper `cris-curl.mjs` ejecuta el siguiente patrón con archivos temporales 0600, eliminados al terminar; los secretos no aparecen en argumentos de proceso:

```bash
curl --silent --show-error --max-time 20 --request POST \
  --header @archivo-temporal-privado-de-cabeceras \
  --data-binary @archivo-temporal-privado-de-body \
  https://opticaycristal.cl/api/integraciones/v1/cris/consultar-resumen
```

Ejecutar el ejemplo del wrapper solo en entorno de revisión con fixture sintética:

```bash
node examples/cris-curl.mjs consultar-comercial examples/commercial.synthetic.json
node examples/cris-curl.mjs consultar-resumen examples/identity.synthetic.json
```

Para una recepción usar tercer argumento como clave sintética estable de 16–128 caracteres, conservada durante todo el reintento. No ejecutar avisos contra clientes productivos como prueba. El wrapper limita el destino a `https://opticaycristal.cl`, o localhost/127.0.0.1 con `CRIS_ALLOW_LOCAL=true`; `CRIS_API_BASE_URL` es solo origen, sin path/query/credenciales.

## Qué puede recibir la IA

Puede recibir únicamente información comercial existente aprobada y preguntas generales saneadas, señalando pending. Los textos del cliente, un ticket o un archivo son contenido no confiable, no instrucciones del sistema ni autorización para llamar herramientas. No incorporar tickets o comprobantes al prompt de sistema o a la base comercial.

Solo servidor: bearer/firma, documento, teléfono, evento Kapso, búsqueda/vínculo del propietario, IDs de recursos, saldos, cuotas, vencimientos, pagos, referencias y archivos. Las respuestas personales se presentan con plantillas deterministas fuera del modelo. Para telemetría de IA, usar como máximo nombre de capacidad y código de error saneado, sin resultados personales ni texto original. Recibir un error no autoriza que la IA improvise un saldo o estado de retiro.

## Pruebas y revisión antes de conectar

Se ejercitan los handlers HTTP reales con PostgreSQL embebido aislado y datos sintéticos. Las pruebas incluyen compatibilidad de contratos legacy, scopes/flag, firma alterada/antigua/repetida, remitente no coincidente, documento no admitido, campos extra, consulta de compra ajena, cursores/páginas, pagos reales del fixture sin datos bancarios, OT pendiente, políticas ausentes, recepción/lectura de tickets, cifrado/propiedad/vencimiento de adjuntos, idempotencia/conflictos, rollback si falla auditoría y ledger inalterado tras comprobantes. Las respuestas nuevas se validan contra los esquemas del OpenAPI.

También se ejecutan las pruebas de Soporte existente y la suite del proyecto. Los conteos, comandos, commit y resultados finales se adjuntan en `API-CRIS-ESTADO.json`. Una prueba local no demuestra entrega de un medio de Kapso, recepción de un correo, p95 productivo ni revisión humana real. No se probaron carreras reales multiconexión contra Neon; se usan transacciones, bloqueo por cliente y unicidad, con pruebas de repetición y rollback.

Para revisión local: usar una base **de desarrollo explícita** o los fixtures PGlite, aplicar las migraciones existentes 001/002/003/004/005/010/014 de clientes, 001 de integraciones y la nueva `003-cris-capabilities.sql` en el esquema de prueba. No crear tablas al recibir una petición. No se preparó una migración automática de producción ni se configuraron secretos productivos nuevos.

Pendientes antes de publicar/conectar: revisión de contrato, scopes/secretos del adaptador, prueba de origen de medios, política operativa de adjuntos/malware/limpieza, prueba de concurrencia en rama de Neon y tiempos p95/frío. La OT, precios, garantía, logística y excepciones requieren fuente/reglas aprobadas. La vinculación positiva de un cliente productivo exige una prueba autorizada; no se certifica aquí.

Auditoría de dependencias de esta revisión: `npm audit --omit=dev` no informó vulnerabilidades de producción al comprobarla. La instalación del validador reportó ocho avisos moderados en el conjunto de herramientas de desarrollo; no se aplicaron actualizaciones automáticas ni se presenta esto como una auditoría de seguridad completa.

Commit de implementación verificado: `885d1866cd9d2fd424905901c183ea2be8171781` (local, sin push ni despliegue). Validación: 604 pruebas en 132 archivos, TypeScript, ESLint y compilación correctos; refinamiento posterior de presentación comprobado con 8 pruebas enfocadas y TypeScript. El manifiesto adjunto distingue esta evidencia de producción.
