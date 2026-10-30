# Implementación del programa de clientes

## Etapa de ventas y financiamiento — 29 de octubre de 2026

Solicitud vigente: ampliar la etapa inicial con registro de ventas exclusivamente
desde administración, búsqueda del cliente existente por RUT, cálculo de pie y
financiamiento, compromiso con fechas, cuotas siempre mensuales y consulta desde
la cuenta del cliente. Esta solicitud amplía el alcance previo sin ventas.

Plan:
1. Resolver por HMAC el RUT validado; exigir una cuenta existente.
2. Calcular en servidor total, crédito y pie según nivel, cupo y costo protegido.
3. Guardar venta y calendario mensual de forma atómica e idempotente.
4. Registrar pagos administrativos con trazabilidad y actualizar capital pendiente.
5. Mostrar compras, cuotas y saldos reales al titular autenticado.
6. Probar límites, fechas mensuales, pagos, duplicados y aislamiento de cuentas.

Decisiones recibidas: precio final con IVA incluido y desglose automático;
costos protegidos configurados por producto/paquete; WhatsApp opcional en esta
etapa, correo verificado obligatorio para financiar; documento imprimible para
firma presencial y pagos manuales. La primera fecha no recibió respuesta:
se permite elegirla al vendedor; siempre posterior a la venta y siguientes
mensualmente con ajuste al último día del mes.

Implementación: motor en `financing.ts`, venta de un producto/paquete con cantidad,
configuración de costo en administración, consulta privada por RUT mediante POST,
venta/cuotas/saldo atómicos, pagos parciales por orden de vencimiento y reintentos
idempotentes. Un financiamiento activo por cliente/RUT. Compras y Cuotas consultan
movimientos reales. La venta guarda condiciones y costos originales, pero el costo
no forma parte de la proyección de datos para clientes.

La migración `002-sales.sql` se aplica solo al esquema explícito de revisión.
Sin publicación. No se emiten documentos tributarios ni se registra una firma
automática: el compromiso se imprime para firmar presencialmente. La iteración A1–A7 agregó anulación de ventas y reversos de pagos con historial;
no hay carga digital de firmas.

1. Reutilizar Next.js, Neon, Resend y marca oficial. Preservar acceso administrativo existente. Copia de trabajo aislada antes de sincronizar los archivos del alcance.
2. Autenticación con Better Auth alojada en la app: se necesitan hooks propios para el registro cifrado de RUT/WhatsApp, validación chilena y categorías iniciales atómicas. Resend ya está integrado. No reemplazar el acceso del personal.
3. Migración aditiva: cuatro categorías y tablas de identidad, sesiones y límites. Start por defecto en el servidor, nunca elegido por el navegador. Con ventas en la etapa del 29 de octubre.
4. Registro, acceso, recuperación y verificación por correo; WhatsApp opcional en esta etapa. RUT y teléfono cifrados en reposo, índice HMAC del RUT para unicidad. Contraseñas y sesiones a cargo de la librería.
5. Portal privado móvil primero y administración de clientes con consultas autenticadas. Historial real de ventas y pagos de la nueva etapa; no simular deuda ni cupos consumidos.
6. Probar registro, duplicados, verificación, expiración/restablecimiento, invalidación de sesión y límites; comprobar aislamiento de cuentas, administración y navegación móvil.

Confirmado: revisar en el proyecto antes de publicar; conservar panel de administradores actual; asignar Start al inscribirse, permitir acceso sin correo verificado y exigir correo verificado para usar financiamiento; WhatsApp queda opcional por decisión del 29/10. WhatsApp no se implementa aún. El usuario autorizó expresamente crear el esquema aislado oc_customers_preview_20261028 en Neon. No publicar ni crear cuentas nuevas del personal en esta etapa.

Ajuste visual solicitado después de la primera revisión: paleta marfil/blanco/vino coherente con la web, CTA verdes (#245c4a), logo oficial más visible y proporcionado en el acceso, tipografías de la óptica y estilo minimalista. Sustituye la paleta azul del mockup inicial; sin cambios en autenticación ni reglas financieras.

## Actualización visual aprobada — 28 de octubre, portal moderno
El portal adopta superficies blancas, grises fríos y verde esmeralda (#007f5f) para las acciones. Se retiran los fondos beige y las tarjetas vino; se conserva el logo oficial. Esta decisión sustituye la paleta marfil/vino anterior del programa, sin cambiar la web comercial. Inicio prioriza disponible real, máximo del nivel y verificación contextual; se consolidan estados vacíos en actividad. Perfil muestra primero las verificaciones y permite desplegar los datos personales. Avatar enlaza al perfil y ayuda tiene acceso permanente en cabecera. Cerrar sesión continúa solo al final de Perfil. No se añade comprar, ofertas ficticias, ascensos sin reglas ni lógica de ventas o de WhatsApp.

### Ajuste de Inicio solicitado en anotaciones
Se retiran «MI ESPACIO», el subtítulo, el párrafo de verificación y el botón financiero de Inicio. El importe destacado pasa a «Cupo disponible» y usa la capacidad del nivel menos capital pendiente, incluso antes de verificar contactos. Se conserva el estado pendiente y el control del backend: el cupo mostrado no implica que esté habilitado para utilizar. Las verificaciones se gestionan en Perfil. Mensaje comercial indicado por el usuario: crédito sin intereses y sin consulta a DICOM, siempre con pie y condiciones del nivel.

## Aplicación de auditoría A1 a A7 — 29/10/2026

- Registro con respuestas equivalentes para conflictos de RUT/correo; unicidad conservada y errores reales separados.
- Sesión del personal vinculada a las credenciales vigentes y `ADMIN_SESSION_VERSION`.
  Retirar/cambiar una cuenta o incrementar la versión invalida sus tokens anteriores.
  Los tokens emitidos antes de este cambio requieren iniciar sesión nuevamente.
- Límite administrativo persistente en el esquema de clientes; falla cerrado si no se puede comprobar.
- Campos de venta bloqueados durante cálculo y respuestas anteriores descartadas.
- Operaciones privadas guardadas por identificador y vendedor. `sessionStorage` guarda
  únicamente un UUID opaco para recuperar resultados o continuar tras recargar.
- Reverso de pagos y anulación con autor, fecha y motivo. No se borra el original.
  No se puede anular con pagos vigentes ni reabrir una deuda si ya hay otro crédito activo.
  Anular no ejecuta devolución de dinero; el pie se muestra como devolución a coordinar.
- Costos editables solo por `CLIENT_COST_ADMIN_USERS` o, por defecto, la cuenta principal
  existente. El vendedor conserva el acceso para vender. Historial completo de cambios desde esta migración.
- Calendario mensual visible antes de registrar; firma presencial pendiente/confirmada,
  registrada por el personal. Imprimir no marca firmado. Documento con enlace de regreso.
- Cuotas prioriza fecha, pendiente y saldo; detalles bajo demanda. Acentos neón con texto oscuro.

Migración aditiva `003-audit.sql`, solo en `oc_customers_preview_20261028` durante revisión.
No publica cambios ni cambia los requisitos vigentes de correo/WhatsApp. A8–A9 del
reporte no forman parte del compromiso principal de esta iteración.

## Soporte implementado — 2026-10-30

Perfil ofrece «Mis tickets de ayuda». El cliente crea una solicitud con asunto
y mensaje, consulta su historial, responde y marca como resuelta. El personal
dispone de una bandeja en Clientes / Tickets de ayuda con filtros por estado,
búsqueda por folio, nombre o correo y conversación con enlace a la ficha.
Las respuestas permanecen en el portal. Cada cliente solo accede a sus tickets;
el personal utiliza la autorización administrativa existente. Los textos se
cifran en reposo. Ver límites y migración 004 en CLIENTES-CONFIGURACION.md.

Los tickets nuevos avisan al equipo por correo y las respuestas del personal
avisan al cliente con dirección verificada. Se utiliza el diseño corporativo
existente y un enlace directo a la conversación, disponible tras iniciar sesión.
El envío es posterior al guardado y cuenta con registro cifrado e idempotencia.

## La óptica en el panel del cliente — 2026-10-30

Nueva vista privada `/mi-cuenta/la-optica`, con dirección, mapa, cómo llegar,
Instagram, WhatsApp, correo y galería de fotos. Aparece en los menús de móvil y
escritorio. En móvil se mantienen cinco accesos: Inicio, Cuotas, Compras,
La óptica y Perfil. La salida sigue únicamente al final de Perfil.
El usuario pidió preparar la galería para fotos reales; mientras no hay fotos
confirmadas, se ofrece el enlace al contenido de Instagram.

## Categorías manuales — 2026-10-30

La ficha administrativa permite al responsable elegir Start, VIP, Premium o
Elite y guardar el cambio. Cada modificación registra nivel anterior, nuevo,
responsable y fecha. El cliente ve su categoría y cupo actuales al consultar el
portal. Las compras, cuotas, pagos y saldos existentes conservan sus condiciones.
No hay ascensos ni descensos automáticos por compras o pagos. El siguiente nivel
presentado en Inicio es informativo; todas las cuentas nuevas comienzan en Start.

## Mensajes de registro y acceso — 2026-10-30

Bienvenida con nombre ingresado: «¡Gracias, [nombre], por sumarte!». Marca en
negrita y vino tinto; rótulo «Tu categoría es Start», máximo y condiciones desde
el servidor. Se retiran el aviso de verificación y la nota secundaria de esta
pantalla, conservando únicamente «Ir a mi cuenta» como acción.
El lateral de registro/login presenta crédito directo en Chile, sin consulta
a DICOM, sin liquidaciones y sin intereses, con el mensaje de confianza.

## Avisos del panel · 30 de octubre
Cinta amarilla compartida en las vistas privadas: créditos presenciales y futura compra web con asesor de IA. Desplazamiento continuo más rápido (40 segundos por ciclo), sin botón de pausa y con versión estática para movimiento reducido. Inicio conserva consulta gratuita y visita; añade un tercer anuncio del futuro asesor en estilo y estética, sin botón de compra ni servicio de IA operativo.

## Categorías y cuotas · 30 de octubre
Actualización expresa del usuario: Start 1 cuota, VIP 2, Premium 3 y Élite 4, siempre mensuales. Se mantienen máximos de $40.000/$60.000/$80.000/$150.000 y porcentajes 30/40/60/70. No se reasignan clientes ni se recalculan ventas existentes. La migración 007 amplía restricciones e introduce estos máximos; el servidor controla el máximo de la categoría al registrar cada venta. El modal compara las cuatro categorías desde los botones del nivel actual y siguiente en Inicio. El enlace `/mi-cuenta/categorias` redirige a Inicio y abre el modal. Diseño blanco, tarjetas de tonos suaves y acentos neón, desplazamiento interno en móvil, cierre con Escape/botón/fondo, foco contenido y restaurado al abrir/cerrar. No ofrece autoascenso.

## Simulador de compra · 30 de octubre
Inicio incorpora una simulación de solo lectura: precio total con IVA y cuotas mensuales permitidas por la categoría. Reutiliza el cálculo de topes/porcentaje, bloquea crédito simulado sin correo verificado o con deuda activa y distribuye pesos completos. Como aún no hay catálogo real seleccionado, muestra explícitamente pie y crédito estimados; el pie definitivo depende del costo protegido de los lentes y se confirma en la óptica. No publica costos internos ni registra ventas, reservas, deuda o cambios de cupo. El usuario eligió conteo suave con destello neón breve; respeta movimiento reducido y limpia los resultados si cambian los datos.
