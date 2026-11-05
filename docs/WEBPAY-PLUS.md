# Webpay Plus — auditoría e implementación

Fecha: 2026-11-05. Base verificada: `99a8ec4275d4fc1d1d181e6e1294103e47b8dddb`.
Rama aislada: `codex/webpay-plus-20261105`.

## Estado real

La producción auditada no tenía SDK, endpoints de creación/confirmación ni variables `WEBPAY_*`/`TRANSBANK_*`/`TBK_*` en Vercel. La configuración de compromisos permitía un enlace externo opcional a Webpay; eso no integraba pagos ni conciliaba cuotas. Producción observada: proyecto `opticaycristal`, equipo `optica-y-cristal`, despliegue `dpl_9NroSVUqtPTJ3rMjpsXqSdTWd7hi`, commit base indicado arriba.

Esta rama incorpora `transbank-sdk@6.1.1`, el SDK oficial para Node.js, sin publicar, sin migrar producción y sin activar cobros. No se han modificado registros reales de clientes. Los casos aprobados/rechazados y conciliación se prueban con PostgreSQL aislado y respuestas de SDK simuladas; adicionalmente se creó una transacción sintética en el sandbox oficial mediante el SDK real, sin pagarla. Falta completar el checkout bancario de extremo a extremo antes de activar producción.

## Dos flujos

### Cuotas y saldo de crédito

En Cuotas y Compras aparece **Mis pagos Webpay** únicamente cuando el servicio está configurado. En `/mi-cuenta/pagos`, el cliente selecciona la próxima cuota pendiente o el saldo total. El servidor resuelve la identidad desde su sesión, comprueba la propiedad de la venta y calcula capital y mora usando el contrato y los pagos existentes. No acepta un monto de deuda enviado por el navegador. Antes de redirigir muestra el desglose y pide continuar expresamente.

Solo un resultado autorizado por Transbank, con monto, orden y sesión coincidentes, registra un pago. Se reutiliza `recordSalePayment`: cuota, saldo, cupo y recibo Webpay se actualizan en una misma transacción. Un retorno repetido no duplica el pago. Si el saldo cambió durante el checkout y ya no concuerda, el cobro autorizado queda en **revisión**, sin una acreditación incorrecta; la óptica debe conciliarlo o gestionar la devolución.

### Catálogo

El catálogo actual contiene imágenes y productos referenciales, sin precios/stock confirmados; el carro envía solicitudes comerciales. No existe una fuente de precios cobrables que permita cobrar automáticamente el contenido del carro con seguridad.

Por eso se mantiene la solicitud actual y se añade `/admin/webpay`: un administrador busca un cliente registrado por RUT, elige un producto, cantidad y total acordado con IVA, y confirma precio y disponibilidad. Se crea un cobro que el cliente encuentra en `/mi-cuenta/pagos`. Solo el cliente lo inicia. El cobro guarda producto y cantidad en la descripción, y un precio inmutable por intento. No se inventan precios ni se convierte la solicitud comercial en una OT de fabricación. Un pago de catálogo no altera deudas de crédito ni crea automáticamente una venta financiada, reserva, despacho, boleta o factura. La óptica procesa la venta y entrega correspondientes.

La compra directa automática desde el carro requiere primero catálogo con precios/stock reales y reglas de entrega aprobadas. No está incluida ni activada en esta rama.

## Seguridad y estados

- SDK y credenciales solo en servidor; no se solicitan ni guardan tarjetas, CVV o claves bancarias.
- Sesión de cliente para sus cobros; administración real para emitir cobros/conciliar. El rol vendedor no administra estos endpoints.
- POST del portal exige mismo origen; 20 operaciones por identidad cada 15 minutos. El retorno bancario no depende de la cookie de sesión, pues el navegador vuelve desde un tercero.
- Solo redirección POST al endpoint oficial del ambiente elegido, con `token_ws`; no se acepta una URL del navegador.
- Tokens cifrados con la protección existente `CLIENT_DATA_KEY`, búsqueda por HMAC; nunca en las proyecciones de historial o auditoría.
- Idempotencia por cliente y UUID de solicitud; un único intento de crédito pendiente por venta. Una solicitud reutilizada con datos distintos devuelve conflicto.
- Estados `quoted`, `creating`, `ready`, `confirming`, `unknown`, `paid`, `rejected`, `cancelled`, `review`. Los inciertos no permiten generar otro intento de la misma deuda. Un borrador de crédito aún no iniciado puede cancelarse.
- La administración dispone de **Consultar resultado con Transbank** para un token conservado: únicamente consulta, nunca ejecuta `commit` por cuenta del cliente. Si el pago ya estaba autorizado, concilia con el libro existente; si sigue inicializado, queda incierto y bloquea otro cobro.
- Un estado `confirming` interrumpido puede consultarse de nuevo después de dos minutos. Esto permite recuperar fallos entre proveedor y base de datos sin doble registro.
- Si falla la creación antes de conservar el token, queda `unknown` y exige revisión humana con Transbank. No se vuelve a crear automáticamente.
- Los retornos de cancelación o mixtos consultan estado; nunca autorizan un nuevo cobro. El retorno HTTP muestra mensajes genéricos sin detalles del proveedor.
- No se implementan devoluciones ni anulaciones bancarias automáticas, cuotas de tarjeta, Oneclick, suscripciones o pagos de terceros. Una devolución realizada fuera del sistema requiere revisar explícitamente el pago del libro existente; no se debe revertir un saldo solo por un aviso o comprobante.
- No hay conciliación programada: el botón administrativo cubre la recuperación controlada. Debe establecerse revisión operativa de los estados inciertos. El listado administrativo muestra los 50 más recientes; el cliente prioriza pendientes dentro de sus últimos 50 resultados. Si se supera ese volumen se requiere paginar antes de usarlo como informe completo.

## Rutas

| Ruta | Autorización | Uso |
| --- | --- | --- |
| `GET /api/clientes/webpay` | Cliente | Cobros propios y ventas con saldo; `?id=UUID` consulta un cobro propio |
| `POST /api/clientes/webpay` | Cliente y mismo origen | `action: credit` con `saleId`, `mode: next/balance`, `requestKey`; `action: start/cancel` con `id` |
| `GET /api/admin/webpay` | Administrador | Últimos cobros, nombre del cliente y referencia |
| `POST /api/admin/webpay` | Administrador y mismo origen | Crear cobro de catálogo o `action: reconcile`, `id` |
| `GET/POST /api/pagos/webpay/retorno` | Token bancario validado por servidor | Retorno a una URL fija de resultados |

Las respuestas son privadas (`no-store`). Errores de validación 400, visitante 401, origen 403, propiedad ajena 404, conflicto/conciliación 409, límite 429, proveedor/configuración 503. Nunca reintentar `create` con un UUID nuevo después de un error incierto. Consultar el historial primero.

Ejemplo sintético del payload de catálogo (solo desde sesión administrativa):

```json
{"rut":"12.345.678-5","productId":"ID_REAL_DEL_CATALOGO","quantity":1,"total":75000,"confirmed":true,"requestKey":"55effdee-c001-4c96-975f-7e3fb54ac813"}
```

El identificador del producto se selecciona desde la lista existente; el ejemplo no es un producto nuevo ni una credencial.

## Configuración y migración

Reutiliza la base de clientes, esquema, cifrado y sesiones existentes. No crear una segunda base. `.env.webpay.example` contiene únicamente nombres y configuración no secreta.

En local/preview aislado:

```dotenv
WEBPAY_ENABLED=true
WEBPAY_ENVIRONMENT=integration
CLIENT_APP_URL=http://localhost:3049
```

El SDK usa sus credenciales públicas oficiales de integración. Nunca poner ese ambiente en Vercel Production: el código lo bloquea expresamente.

Para producción se requieren **código de comercio y API Key REST productivos de Webpay Plus de Óptica y Cristal**, habilitación del comercio y el proceso de validación que indique Transbank. Guardarlos como variables sensibles de servidor en Vercel, sin pegarlos en chats ni Git:

- `WEBPAY_COMMERCE_CODE`
- `WEBPAY_API_KEY`
- `WEBPAY_ENVIRONMENT=production`
- `CLIENT_APP_URL=https://opticaycristal.cl`
- Mantener `WEBPAY_ENABLED=false` durante preparación.

Migración aditiva: `sql/clients/023-webpay-plus.sql`. Crea dos tablas e índices, sin reescribir clientes, ventas o pagos anteriores. Ejecutar primero contra una rama aislada y luego sobre el esquema explícito autorizado de producción, con una conexión directa y las variables privadas existentes:

```sh
WEBPAY_MIGRATION_CONFIRM=023 node scripts/migrate-webpay.mjs
```

El script exige `CLIENT_DATABASE_SCHEMA` distinto de `public` y verifica ambas tablas. Se probó aplicar la migración dos veces con PostgreSQL aislado. No se ejecutó en producción.

Antes de `WEBPAY_ENABLED=true`: publicar el commit revisado, comprobar migración y variables en el despliegue exacto, completar pagos de integración aprobados/rechazados/cancelados con navegador, validar retornos y registros, y acordar el manejo de discrepancias/devoluciones. Después verificar una compra productiva controlada, expresamente autorizada y conciliada con Transbank. Activar un flag o recibir un HTTP 200 no prueba que el dinero fue recibido.

## Evidencia de pruebas

- TypeScript y ESLint.
- Build de Next.js con webpack; no se modifica el comando productivo del proyecto.
- Pruebas del SDK/configuración, callback GET/POST, origen, sesión, propiedad, idempotencia, cifrado, registro único, reintento, pago manual simultáneo, rechazo, cancelación y recuperación.
- Componentes: carga inmediata, confirmación antes de redirigir, importe calculado por servidor, ambiente desactivado y estados inciertos sin CTA de segundo cobro.
- Suite general y resultados finales en `output/webpay/VERIFICACION.txt`.

## Referencias oficiales

- SDK: https://github.com/TransbankDevelopers/transbank-sdk-nodejs
- Documentación: https://transbankdevelopers.com/documentacion/webpay-plus
- Ejemplo oficial Node.js: https://proyecto-ejemplo-node.transbankdevelopers.cl/webpay-plus

Las capturas de móvil/escritorio se obtuvieron montando el componente real con API sintética en un servidor local de revisión; no corresponden a una cuenta real ni demuestran un pago bancario completo. Se verificaron apertura del modal, importes y ausencia de desbordes horizontales a 390 y 1440 px. El build y las pruebas de autorización cubren las rutas, pero queda pendiente navegar el flujo con sesiones reales de un entorno aislado y completar el checkout de integración.
