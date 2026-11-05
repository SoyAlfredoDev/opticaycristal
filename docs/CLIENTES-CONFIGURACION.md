# Programa de clientes: revisión previa a publicación

## Rutas
- `/mi-cuenta/registro`, `/mi-cuenta/ingresar`, `/mi-cuenta/recuperar`, `/mi-cuenta/restablecer`.
- Portal privado `/mi-cuenta`, `/mi-cuenta/perfil`, `/mi-cuenta/compras`, `/mi-cuenta/cuotas`, `/mi-cuenta/ayuda`.
- Personal existente: `/admin/clientes` y `/admin/clientes/[id]`. Un cliente no puede convertirse en administrador al registrarse.

## Configuración del servidor
- `CLIENT_AUTH_SECRET`: mínimo32caracteres aleatorios. Independiente del secreto del personal.
- `CLIENT_DATA_KEY`:32bytes aleatorios en base64. Protege RUT y WhatsApp; pérdida o cambio sin migración impide leer los datos. Custodiar fuera del repositorio y respaldar mediante el gestor de secretos.
- `CLIENT_APP_URL`: origen exacto de esta instalación. HTTPS en producción; localhost con puerto en desarrollo. No derivar enlaces de recuperación desde cabeceras Host o URLs aportadas por terceros.
- `CLIENT_DATABASE_URL`: opcional, reutiliza DATABASE_URL si no se especifica. `CLIENT_DATABASE_URL_UNPOOLED` permite conexión directa para migrar.
- `CLIENT_DATABASE_SCHEMA`: espacio propio para clientes. En revisión usar un esquema aislado como `oc_customers_preview_20261028`; producción requerirá la configuración de su esquema antes de publicar. Consultas calificadas por esquema, sin depender del estado de sesión de un pooler.
- `CLIENT_ADMIN_USERS`: opcional, restringe aún más las cuentas internas actuales por usuario, separadas por comas. Nunca basta con que un correo se registre públicamente.
- Reutiliza RESEND_API_KEY y remitente existente contacto@opticaycristal.cl. El dominio está verified y con envío habilitado, comprobado mediante el conector el28/10/2026. La clave existente solo tiene permisos de envío: no usar sus fallos de lectura para concluir que no puede enviar. El dominio tiene tracking de marketing activo; los correos de seguridad se envían como texto sin HTML, píxeles ni enlaces HTML reescritos. No se modificaron las campañas ni la configuración del dominio. Las funciones de correo no inventan entregas exitosas: si el proveedor falla se informa un error genérico. La recepción real de un correo no se ha probado; las pruebas usan un receptor aislado sin envíos a terceros.

## Migración
`npm run db:clients:prepare` crea únicamente tablas con prefijo oc_client dentro del esquema explícito y registra las cuatro categorías. No importa clientes ni modifica solicitudes, pedidos, CRM o datos previsionales. Se prueba contra PostgreSQL aislado antes de aplicarla. No ejecutar contra public.

El esquema tiene unicidad de correo y HMAC del RUT, restricciones de categoría y creación de saldo cero en la misma transacción del usuario. La migración 002 agrega productos, ventas, cuotas y pagos. Nunca inferir compras a partir de registros anteriores sin una asociación autorizada.

## Reglas vigentes
Start desde inscripción, hasta30%/40000CLP/1cuota. VIP40%/60000/1, Premium60%/80000/2, Elite70%/150000/2. No se implementan ascensos automáticos aún.

La cuenta es accesible aunque el correo esté pendiente. El máximo se asigna al registrar. Para utilizar financiamiento, se requiere correo verificado. WhatsApp es opcional por decisión del usuario del 29/10/2026; su verificación no está implementada. Por eso puede existir un máximo de40000 y un disponible para uso de0. No implementar un bypass que marque WhatsApp verificado por un checkbox del cliente o del navegador. La revisión presencial de cédula no sustituye estas verificaciones.

## Protección y pruebas
- Better Auth1.7 gestiona hash scrypt, sesiones HttpOnly/SameSite, tokens de recuperación de30minutos, correo de24horas, identificadores de tokens hash y revocación de sesiones al cambiar contraseña. Inicio sin auto-login después de reset.
- Registro validado en servidor, campos cifrados AES-256-GCM con contexto y unicidad RUT con HMAC; sin RUT/teléfono en respuestas genéricas de sesión. Nombre y correo permanecen necesarios para operar la cuenta.
- Registro, login, recuperación y reenvío limitados por base de datos; nunca solo memoria de una instancia. Origin exacto en mutaciones y lista cerrada de rutas públicas Better Auth.
- Reenvío de verificación requiere sesión y solo se dirige al correo de esa sesión. No se implementa cambio de correo ni modificación pública de categoría/flags.
- Datos privados no se guardan en localStorage ni se almacenan en caché offline; respuestas privadas no-store y noindex. El manifiesto brinda presentación standalone, sin service worker para cachear datos personales.
- Probar cuentas distintas y personal no autenticado; no enviar correos de prueba a clientes reales. Los tests integrales usan PostgreSQL local PGlite y un receptor de correo en memoria.
- Los registros y reclamaciones de privacidad se atienden mediante contacto oficial. Revisar antes del lanzamiento la política, proveedores, retención, eliminación de cuentas y futuras condiciones legales del financiamiento; no presentar estos textos como asesoría legal ni contrato de crédito.

## Fuera de alcance
No publicado. Sin verificación real de WhatsApp, pago online, descuentos por nivel ni documento jurídico revisado. Hay registro administrativo de ventas y pagos y compromiso operativo imprimible. No se muestran transacciones ficticias a usuarios reales. Las cuentas individuales del personal se planificarán después manteniendo el acceso interno actual.

Referencias: https://better-auth.com/docs/integrations/next · https://better-auth.com/docs/authentication/email-password · https://better-auth.com/docs/concepts/rate-limit

Referencia sobre seguimiento de HTML y separación de correos sensibles: https://github.com/resend/resend-skills/blob/main/skills/resend/references/sending/overview.md

## Ventas y pagos — etapa del 29/10/2026
- Administración: `/admin/clientes/ventas`; acceso desde Clientes. Primero configurar
  productos o paquetes y costo protegido interno por unidad, sin inventar costos.
- Buscar cliente existente por RUT. Se usa HMAC normalizado, nunca RUT en URL.
- Una venta corresponde a un producto/paquete con cantidad y precio total final.
  Desglose: neto = redondeo(total / 1,19); IVA = total − neto. No emite boleta/factura.
- Crédito máximo: mínimo entre porcentaje del nivel, cupo por saldo y total menos
  costo configurado multiplicado por cantidad. Siempre pie. Un financiamiento activo
  por cliente; puede registrar ventas al contado mientras exista deuda.
- Requiere correo verificado, revisión presencial de cédula confirmada por vendedor
  y confirmación de pie recibido. WhatsApp opcional en esta etapa.
- Vendedor elige primer vencimiento futuro. Siguientes cuotas siempre mensuales;
  conservar el día original o usar fin de mes. Pesos enteros, diferencia en última cuota.
- El compromiso contiene las condiciones originales y espacios para firma; generarlo
  no acredita firma ni aceptación. Contratación presencial. No se envía por correo.
- Pagos manuales: monto recibido, fecha no futura ni anterior a la venta y referencia;
  se aplican a cuotas antiguas, admiten pagos parciales y anticipados, impiden sobrepago.
- Venta/cuotas/saldo se guardan juntos; pagos/cuotas/saldo también. Bloqueo por cliente,
  restricción única de crédito activo y UUID de idempotencia contra doble envío.
- Costos internos y usuario del vendedor no se incluyen en respuestas al cliente.
- Anulaciones y reversos operativos disponibles en la iteración A1–A7; no editar directamente saldos.

## Seguridad y correcciones de auditoría A1–A7

`ADMIN_SESSION_VERSION` (opcional, por defecto `1`) permite invalidar las sesiones del
personal al cambiar su valor. Las sesiones también se invalidan si cambia la contraseña
o se retira la cuenta configurada. No hay nuevas cuentas del personal en esta etapa.
El límite de acceso administrativo usa `oc_client_admin_login_limits`, con IP protegida
por HMAC; requiere la migración `003-audit.sql` para iniciar sesión.

`CLIENT_COST_ADMIN_USERS` restringe quién puede crear y modificar productos/costos.
Acepta usuarios internos existentes separados por comas. Si se omite, solo la cuenta
principal (`ADMIN_USER`, o `ADMIN_USER_2` si es la única configurada) administra costos.
Las modificaciones guardan valores anteriores/nuevos, fecha y autor en
`oc_client_product_changes`; no modifica las condiciones históricas de ventas.

Recuperación: el navegador guarda solo el identificador de operación, nunca el RUT,
correo o datos de pago. El servidor guarda la solicitud y permite recuperarla únicamente
al vendedor autenticado que la registró. Sesión expirada o error de conexión conservan el identificador;
no comenzar otro registro hasta resolver el pendiente. La recuperación se mantiene en la
misma pestaña después de recargar; no promete sincronización entre dispositivos.

Correcciones: revierte pagos antes de anular una venta. Un reverso redistribuye los pagos
vigentes en orden de cuota y actualiza el capital en la misma transacción. No permite
reabrir crédito si hay otro activo. Anulación/reverso son registros operativos, no
transferencias bancarias ni devoluciones automáticas. La devolución de un pie se coordina
presencialmente. No se borran ventas ni pagos al corregirlos.

La confirmación de firma guarda fecha y responsable después de revisar la firma física;
no digitaliza firmas ni sustituye revisión jurídica del compromiso.

## Variables productivas configuradas — 29/10/2026

Con autorización explícita del usuario se crearon en Vercel, proyecto
`opticaycristal`, equipo `optica-y-cristal`, exclusivamente para **Production**:

| Variable | Tipo | Configuración |
| --- | --- | --- |
| CLIENT_AUTH_SECRET | Secret | Nueva clave aleatoria independiente de desarrollo y del personal |
| CLIENT_DATA_KEY | Secret | Nueva clave aleatoria de 32 bytes en base64 |
| CLIENT_APP_URL | Config | https://opticaycristal.cl |
| CLIENT_DATABASE_SCHEMA | Config | oc_customers |

Se verificaron las cuatro filas y el alcance Production en el panel. Las claves
no se imprimieron ni se incluyeron en documentación. El respaldo local de las
cuatro variables está en `.env.clients-production.local`, excluido de Git y con
permisos solo para su propietario. Custodiar especialmente CLIENT_DATA_KEY: no
regenerarla después de registrar clientes sin una migración de los datos cifrados.
La copia local no sustituye el respaldo en un gestor de secretos.

Se conserva DATABASE_URL como conexión existente por el fallback del módulo;
RESEND_API_KEY y los accesos internos existentes no se modificaron. No se comparten
estas claves con Preview ni Development. La configuración entra en vigor en un
nuevo despliegue: esta operación no desplegó código ni ejecutó migraciones.
Siguen pendientes verificar/aplicar 001–003 en el esquema productivo, configurar
productos/costos reales y probar los flujos del nuevo despliegue.

### Conexión explícita y migraciones completadas

Durante la preparación autorizada del 29/10 se añadió también
`CLIENT_DATABASE_URL` como **Secret solo en Production**, apuntando a la base
existente `optica_web_db` de Neon usada por este proyecto. Su valor está en el
mismo respaldo local ignorado. El módulo ya no depende del fallback DATABASE_URL;
la conexión general de la web no se cambió. Las claves de producción permanecen
separadas de las de revisión.

Las migraciones 001–003 se aplicaron por conexión directa TLS al esquema nuevo
`oc_customers`; se verificaron 15 tablas, cuatro niveles y cero clientes,
productos, ventas y pagos. La prueba de saldo inicial y rechazo de saldo negativo
se revirtió por completo. Ver PREPARACION-PRODUCCION-2026-10-29.md y los registros
JSON asociados. Quedan pendientes catálogo real, publicación y recepción real de
correos de prueba autorizados.

## Soporte por tickets — 2026-10-30

- Perfil enlaza a `/mi-cuenta/soporte`; administración atiende en
  `/admin/clientes/soporte`. Se reutilizan las sesiones y el control de personal.
- Ejecutar la migración aditiva `sql/clients/004-support.sql` con la conexión
  directa y el esquema de clientes existente. `scripts/migrate-support.mjs`
  ejecuta únicamente esta migración; cargar las variables desde el entorno
  seguro antes de invocarlo. El preparador completo también incluye 004.
- No requiere nuevas variables. Asunto y mensajes utilizan `CLIENT_DATA_KEY`
  con propósitos distintos de los datos personales. Conservar esta llave.
- El cliente puede pedir ayuda aunque no haya verificado el correo. Cada
  consulta y escritura exige sesión; el propietario se obtiene del servidor.
- Estados: pendiente al crear o responder el cliente, respondido al contestar
  el personal, resuelto al cerrar. Una respuesta reabre el ticket. El cierre
  exige haber visto el último mensaje y deja registro en la conversación.
- Asunto de hasta 100 caracteres; mensajes de hasta 2.000. Texto plano, sin
  adjuntos. Las respuestas se consultan dentro del portal; los avisos por correo se describen a continuación.
- Límites: 5 tickets nuevos/hora, 10 activos por cliente, 20 mensajes/hora del
  cliente y 120 del personal; 100 mensajes por conversación, con cierre permitido
  al alcanzar el límite. Las claves de envío evitan duplicados al reintentar.
- Pruebas aisladas: creación, respuesta, cierre, reapertura, límites, cifrado,
  permisos por propietario, sesiones/origen y reintentos. La migración se probó
  dos veces en un esquema temporal de Neon, eliminado al terminar; sin escribir
  solicitudes en cuentas reales.


## Avisos de soporte — 2026-10-30

- Migración aditiva `005-support-mail.sql`; ejecutor específico
  `scripts/migrate-support-mail.mjs`. Reutiliza Neon, Resend y `CLIENT_DATA_KEY`.
- Al crear un ticket se avisa al equipo en `opticaycristal.cl@gmail.com`.
  Se puede cambiar únicamente desde el servidor con `CLIENT_SUPPORT_EMAIL`.
- Cada respuesta del personal genera un aviso al correo verificado del cliente.
  Si falta verificarlo, queda en espera. Al volver a consultar Soporte se revisan
  los pendientes; nunca se envía a una dirección que haya cambiado desde el evento.
- Remitente y respuesta: `contacto@opticaycristal.cl`. Mismo logo CID/PNG,
  colores, razón social, RUT y domicilio de los correos de acceso. HTML y texto.
  El seguimiento de aperturas y clics permanece desactivado en Resend.
- El correo contiene folio y acceso directo al ticket, sin asunto privado ni
  contenido de la conversación. Los enlaces exigen la sesión correspondiente.
- Ticket/respuesta y aviso cifrado se registran en una transacción. El envío
  ocurre después de la respuesta HTTP mediante `after`; una falla del proveedor
  no revierte el ticket. Se conserva una clave idempotente por aviso.
- Hasta tres intentos inmediatos. Ante fallas transitorias, el aviso sigue
  pendiente y es elegible tras cinco minutos; las consultas autenticadas a
  Soporte recuperan un aviso por solicitud. No depende de un cron ni del módulo
  de marketing. Si no hay nuevas consultas, no hay reintentos posteriores a los
  iniciales. Pasadas 22 horas desde el primer intento, una entrega incierta se
  marca para revisión en lugar de arriesgar duplicados fuera de la ventana del
  proveedor. Rechazos definitivos requieren revisar configuración/proveedor.
- En la conversación administrativa se muestra si el aviso está pendiente,
  enviado, sin confirmar o en espera de verificar el correo. «Enviado» significa
  aceptado por el proveedor; no equivale a lectura del destinatario.
- Se probaron dos envíos reales, marcados PRUEBA SOPORTE, únicamente a la casilla
  autorizada; Resend confirmó ambos como `delivered`. Los tickets de prueba se
  crearon en un esquema aislado de Neon, eliminado al terminar.

## Vista La óptica — 2026-10-30

- Ruta privada `/mi-cuenta/la-optica`, protegida por el layout de clientes.
- Reutiliza `brand`, `store`, `storeMapUrl`, `whatsappUrl` y `storePhotos` de
  `src/components/site/content.ts`. El mapa no requiere una llave nueva.
- Iframe con carga diferida y `referrerPolicy="no-referrer"` para preservar la
  ruta privada. Los accesos a Maps, Instagram y WhatsApp abren con noreferrer.
- La galería acepta fotos reales confirmadas: guardar los archivos en
  `public/images/local/` y añadir cada `{ src, alt }` a `storePhotos`. La vista
  genera las miniaturas y su acceso para ampliar. El usuario decidió esperar
  las fotos reales. Con la lista vacía se muestra una invitación a ver Instagram.
- El botón flotante de ayuda se omite en esta vista; están disponibles los
  contactos de la propia página y el acceso habitual de Ayuda en la cabecera.

## Cambio de categorías — 2026-10-30

- Migración aditiva `006-categories.sql`; ejecutor específico
  `scripts/migrate-categories.mjs`. Crea únicamente el registro de cambios.
- Control en la ficha `/admin/clientes/[id]` y API administrativa
  `/api/admin/clientes/[id]/categoria`. Se exige sesión del personal y origen
  propio para escribir. El cliente público no puede modificar su categoría.
- Permiso: `CLIENT_CATEGORY_ADMIN_USERS` es una lista opcional de usuarios del
  personal, separados por coma. Si está vacía, pueden editar los administradores
  ya autorizados en el módulo de clientes. Una lista específica restringe ese
  permiso; siempre se exige la sesión administrativa y el acceso al módulo.
  El correo público no concede permisos y la edición de costos sigue separada.
- Se cambia solo la categoría del cliente. Los límites se toman de los niveles
  configurados en la base; el navegador no puede definir cupos, porcentajes ni
  plazos. Las ventas conservan sus condiciones guardadas. Un cambio con deuda
  pendiente no habilita una segunda compra a crédito; la capacidad se limita a
  cero cuando el saldo supera el máximo del nuevo nivel.
- Actualización e historial en una transacción con bloqueo del cliente, compartido
  con el flujo de ventas. Categoría esperada para evitar sobrescribir una edición
  simultánea; clave de envío para reintentar sin duplicar el cambio.
- La ficha muestra los cinco últimos cambios; el historial completo queda en
  `oc_client_category_changes`. No se envían correos de cambio de categoría.
- Auditoría: registro Start, siguiente nivel informativo, sin automatización de
  categorías en ventas/pagos, sin pg_cron y un único disparador de clientes para
  inicializar saldo. Se probaron rechazos de cambios públicos, perfiles que
  conservan su categoría, pagos sin ascenso y conservación de ventas previas.

## Bienvenida personalizada — 2026-10-30

- `AuthForm` pasa a `RegistrationWelcome` el nombre ya ingresado en el formulario.
  No se consulta ni expone el nombre de una cuenta existente. La respuesta neutral
  para registros duplicados y los controles de registro se conservan.
- El máximo, porcentaje y cuotas de Start siguen viniendo del servidor. Cambia
  únicamente la presentación a «Tu categoría es…»; no se calcula crédito adicional.
- Se elimina el recordatorio de correo de la bienvenida por petición del usuario.
  El envío y la verificación de correo siguen activos; los requisitos para usar
  crédito y la vista de verificaciones en Perfil mantienen su comportamiento.
- `AuthBenefits` se muestra como columna lateral en registro y acceso. Se utiliza
  «La única óptica con crédito directo en Chile», según el texto solicitado expresamente por el propietario.
- Revisión con nombre y datos simulados: sin registros ni correos de prueba reales.

### Cuotas por categoría · migración 007
Después de publicar el código que acepta hasta cuatro cuotas, ejecutar `scripts/migrate-installments.mjs` con la conexión directa y el esquema de clientes existente. La transacción amplía las tres restricciones de cuotas y actualiza exclusivamente `oc_client_tiers.max_installments`: Start 1, VIP 2, Premium 3, Elite 4. Es repetible, con espera de bloqueo limitada a cinco segundos. No toca ventas, pagos, vencimientos ni asignaciones de clientes. La comparación del portal consulta los niveles desde la misma tabla usada por administración.

## Rendimiento y observabilidad — 31/10/2026

- La base existente está en `us-east-2`. `vercel.json` prepara `cle1` como región de ejecución próxima a la base; tendrá efecto con el siguiente despliegue. No se migra la base de datos.
- El pool conserva `max: 4`, TLS verificado y keep-alive. En local mantiene conexiones 60 s; en Vercel usa 5 s y `attachDatabasePool` para cerrar conexiones antes de la suspensión.
- Los nuevos endpoints privados exponen tiempos numéricos mediante `Server-Timing` y comprueban sesión antes de comparar ETag. Nunca habilitar caché HTTP compartida para estos datos.
- Aplicar `sql/clients/009-customer-history-indexes.sql` mediante el preparador habitual antes de publicar; crea índices para ventas y pagos, sin cambiar condiciones de crédito ni registros.
- Referencias: [pool de conexiones en Vercel](https://vercel.com/kb/guide/efficiently-manage-database-connection-pools-with-fluid-compute), [regiones](https://vercel.com/docs/regions).


## Compromisos y simulador — revisión 2026-11-02

Migración 010 aplicada el 02/11/2026 con autorización explícita del usuario. Se verificó por huellas que ventas, cuotas, pagos, saldos y productos preexistentes conservaron sus datos. El código sigue pendiente de publicación; la versión local usa el esquema actualizado.

Después de migrar, el administrador autorizado configura `/admin/clientes/compromisos`: nombre legal completo del representante, RUT, PNG original de firma (máximo 80 KB y 2000 × 1000 px), autorización de uso, medios local/transferencia y máximo legal anual verificado. Datos y firma se cifran con las llaves existentes; no cambiar esas llaves sin un plan de recifrado. Webpay no está configurado; se habilita únicamente con enlace oficial posterior.

Cada nueva venta a crédito requiere la configuración y crea un documento inmutable en la misma transacción. Una configuración incompleta cancela íntegramente la creación del crédito. No marcar la firma presencial hasta que el cliente firme y reciba su copia; conservar el original firmado. Operaciones anteriores no adquieren la nueva tasa.

La mora nueva es 18 % anual simple (equivalente a 1,5 % mensual), desde el día 61, limitada al máximo legal configurado. No se consulta automáticamente a CMF: el responsable verifica la vigencia antes de contratar y revisa liquidaciones si cambia el máximo. Registrar/condonar mora separada del capital y documentar los motivos de condonación.

`/admin/clientes/simulador` funciona por RUT o categoría referencial. «Propuesta de crédito» PDF no es contrato, venta ni reserva de cupo. El servidor revalida los límites y la situación del cliente al descargar. No requiere datos del representante para simular.

Ver investigación, decisiones y comprobaciones en `docs/contracts/compromiso-pago-20261102.md`.


## Productos de costo variable — 2026-11-02

Migración 011 (`npm run db:clients:variable-products`): permite que el costo del catálogo y su registro de cambio sean NULL para representar un producto de costo variable. Los costos fijos y los costos históricos de ventas no se modifican. NULL no significa costo cero.

Crear «Lente óptico» desde Productos y costos, marcando «El costo varía en cada venta». No asignar un costo ficticio. El vendedor debe indicar el costo protegido total por unidad, incluidos impuestos que correspondan, antes de calcular; el servidor valida pesos enteros positivos, multiplica por cantidad y limita el crédito para proteger el pie. El costo queda registrado en la venta y en el reintento de esa misma operación. Un costo enviado para un producto fijo no reemplaza el configurado.

El simulador administrativo también exige el costo al seleccionar un producto variable. Ese costo interno no aparece en la propuesta PDF ni en el historial del cliente. Migración 011 aplicada el 02/11/2026 con autorización explícita del usuario. Las ventas, cuotas, pagos, saldos y productos preexistentes conservaron sus datos. Se creó y verificó exactamente un producto «Lente Óptico» con costo variable y auditoría desde la sesión administrativa; no se asigna un costo fijo ficticio. La publicación del código sigue pendiente.


### Venta por etapas y edición de contactos · 2 de noviembre de 2026

Ventas muestra una sola tarjeta activa: cliente; producto, costo y precio con IVA; cálculo y condiciones. Se puede retroceder conservando los campos. Los cambios financieros invalidan el cálculo o su aceptación. La confirmación del vendedor no reemplaza la firma presencial del cliente. Los reintentos conservan el identificador y el contenido de la operación. Se mantienen recuperables las operaciones antiguas sin el campo nuevo `conditionsReviewed`; las nuevas exigen revisión expresa.

La edición administrativa permite nombre, apellido y WhatsApp. El RUT nunca se modifica. El correo solo se puede corregir si sigue sin verificar al tomar el bloqueo de la fila. Un cambio de correo revoca sesiones y enlaces de recuperación, conserva pendiente su verificación y reserva la dirección anterior para otros usuarios durante 25 horas: la vigencia de los enlaces de verificación más una hora de margen. El envío de verificación/recuperación comprueba la dirección actual antes de enviar. No usar una versión anterior del servicio de autenticación para habilitar esta edición.

La migración aditiva `012-customer-profile-edits.sql` agrega historial de contactos cifrado y reservas temporales de correo con protección en la base de datos. Comando: `npm run db:clients:customer-edits`. Se aplicó al esquema configurado y se verificó que clientes, ventas, cuotas, pagos y saldos conservaran el mismo contenido; no se crearon registros financieros de prueba.

Después de registrar una venta a crédito se ofrece `Descargar compromiso de pago`. El PDF usa exclusivamente la copia inmutable de esa venta, conserva el calendario original, incluye la firma preimpresa autorizada y el espacio de firma del cliente. Su descarga no crea ni modifica ventas. También queda disponible la versión imprimible. Si falta la firma del representante en Compromisos, la interfaz informa el requisito y bloquea la confirmación de crédito; el contado continúa disponible.

Verificación: PostgreSQL aislado para cambios de contacto, protección de correos, auditoría y operaciones financieras; pruebas de permisos/origen; PDF A4 de ejemplo renderizado y revisado; navegación local sin crear ventas ni modificar contactos reales. El código de esta mejora se prepara localmente, sin publicación automática.


### Verificación por código en Ventas · 2 de noviembre de 2026

La tarjeta de cliente incluye el lápiz de edición y un check o una advertencia accesibles para el correo. El botón Verificar envía un código numérico de cuatro dígitos con la plantilla corporativa existente y permite ingresarlo en la misma tarjeta. Se conservan ceros iniciales. Solo el personal autenticado puede solicitar o confirmar el código, con control de origen y vinculación al cliente, correo y operador. No se devuelve ni registra el código en texto visible: se conserva un HMAC con clave privada y se elimina al usarlo.

Los desafíos vencen en 10 minutos y admiten cinco intentos. El reenvío espera un minuto y conserva límites de tres envíos por ventana de una hora y seis por ventana diaria, aunque cambie el operador o el correo. Los desafíos anteriores se reemplazan. Un cambio de correo o un fallo confirmado del envío invalida su código. El envío requiere `RESEND_API_KEY` en el servidor, con el remitente corporativo existente. La migración aditiva `013-staff-email-codes.sql`, disponible mediante `npm run db:clients:email-codes`, fue aplicada sin alterar clientes, ventas, cuotas, pagos ni saldos existentes.

El formulario de venta ya no muestra el bloque inferior de casillas y párrafos. Registrar venta abre un recordatorio: revisión de cédula, correo y firma presencial del compromiso. Cancelar no registra nada. Confirmar venta declara la revisión de identidad y condiciones y la recepción del monto mostrado. No marca el compromiso como firmado; la firma física sigue siendo una acción posterior. Una configuración de firma pendiente permite revisar el recordatorio pero bloquea su confirmación para crédito. Los reintentos conservan la operación original.

Pruebas de códigos, límites, expiración, cambio de correo, permisos, plantilla y confirmación con datos sintéticos y transporte de correo simulado. La revisión visual no envió códigos a clientes reales ni registró una venta. Código preparado localmente; sin publicación automática.

### Cálculo de ventas por categoría · 2 de noviembre de 2026

La captura administrativa de nuevas ventas aplica el porcentaje, cupo disponible y máximo de cuotas mensuales de la categoría. El precio total conserva el IVA incluido y el pie es la diferencia entre ese total y el crédito autorizado. El costo variable por producto ya no se pide en cada venta ni limita el cálculo. El servidor marca estas operaciones con `pricingPolicy: "category"` y guarda `protected_cost` como `NULL` para indicar que no se utilizó un costo, nunca como cero. La migración `014-category-sale-pricing.sql` permite ese valor opcional; no modifica productos ni ventas históricas. Las solicitudes anteriores sin la marca conservan el cálculo de costo protegido para permitir reintentos seguros.

El simulador administrativo usa las mismas condiciones de categoría. La vista cliente conserva el mismo modelo. Correo verificado, los límites de financiamiento y el pie obligatorio continúan aplicándose.


### Niveles y beneficios — migración 015

La nueva vista `/admin/clientes/niveles` configura porcentaje, cupo y cuotas de los niveles con historial por usuario. Aplicar la migración 015 antes de publicar. Alcance, permisos y activación: [NIVELES-Y-BENEFICIOS.md](NIVELES-Y-BENEFICIOS.md).


### Avisos administrativos en evaluación local

Implementación nueva solo en desarrollo, sin migraciones productivas ni publicación. Evaluación en memoria: `npm run dev:notifications`. Diagnóstico, eventos, permisos y activación futura: [AVISOS-ADMINISTRATIVOS-DESARROLLO.md](AVISOS-ADMINISTRATIVOS-DESARROLLO.md).


### Ascensos y felicitaciones en desarrollo

La migración 018 y el correo de ascenso están preparados únicamente para evaluación local. No se activaron reglas automáticas ni envíos reales. Detalle, decisiones confirmadas y revisión: [ASCENSOS-Y-FINANCIAMIENTO-DESARROLLO.md](ASCENSOS-Y-FINANCIAMIENTO-DESARROLLO.md).

### Encuestas de satisfacción

Requiere migración `024-satisfaction-surveys.sql`, las variables existentes de correo/base/cifrado y `CRON_SECRET`. Activación explícita con `CLIENT_SURVEYS_ENABLED=true`. La tarea diaria a las 15:00 UTC programa el envío del siguiente día calendario de Santiago. Ver límites de cola, reintentos y comprobaciones previas en `docs/ENCUESTAS-SATISFACCION.md`; no se han configurado ni enviado correos productivos en esta implementación.
