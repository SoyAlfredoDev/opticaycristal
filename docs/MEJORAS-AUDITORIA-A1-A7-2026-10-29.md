# Mejoras A1 a A7 del programa de clientes

29/10/2026 · Implementación local para revisión, sin publicar.

| Punto | Aplicación |
| --- | --- |
| A1 | Registro con estado y mensaje equivalentes para RUT/correo duplicados, conservando unicidad. |
| A2 | Sesiones vinculadas a credenciales vigentes y versión de revocación; límite persistente del acceso administrativo. |
| A3 | Campos bloqueados al calcular y descarte de respuestas antiguas. |
| A4 | Solicitud recuperable antes de ejecutar, UUID opaco en la pestaña, consulta de resultado; reversos y anulaciones con trazabilidad. |
| A5 | Editor de costos con valores actuales y revisión anterior/nuevo; permiso del responsable e historial en base de datos. |
| A6 | Calendario visible antes de registrar; firma física pendiente/confirmada y regreso desde el compromiso. |
| A7 | Próxima cuota destacada; saldo y fechas primero, detalles desplegables; acentos neón de contraste oscuro. |

La devolución del pie se coordina por separado: anular no transfiere dinero.
No se permite anular con pagos vigentes ni revertir un pago que reabriría otra
financiación cuando el cliente ya tiene una activa. Se conserva el historial.

La recuperación guarda únicamente el UUID en sessionStorage, sin datos personales.
Antes de ejecutar se confirma que la solicitud ya esté guardada en el servidor;
una recarga puede consultar el resultado o continuar con el mismo identificador.
Se conserva ante pérdida de conexión o sesión expirada. No sincroniza pestañas ni dispositivos.

La edición de costos corresponde a CLIENT_COST_ADMIN_USERS; sin esa configuración,
se usa la cuenta principal existente. ADMIN_SESSION_VERSION permite revocar sesiones.
No se crean cuentas nuevas ni se modifica la obligatoriedad vigente del correo/WhatsApp.

La migración 003-audit.sql se aplicó al esquema oc_customers_preview_20261028.
Los costos históricos y el capital no se recalculan retroactivamente.

Verificación automatizada: 222 pruebas del proyecto en 49 archivos, incluidas 66
pruebas del módulo. TypeScript y ESLint correctos. Se probaron duplicados de RUT,
revocación, persistencia del limitador, cotización lenta, edición de costos,
recuperación tras recargar, pagos, reversos, anulación y firma.

A8 y A9 del reporte original quedan para otra iteración; se incluyó incidentalmente
el aviso de referencia visible al cliente por ser necesario en el formulario de pago.

Revisión de navegador: producto creado con revisión previa y precarga al editar;
venta con calendario antes de confirmar; recuperación de una venta ya guardada
sin repetirla; firma presencial confirmada; pago de 10.000 con resumen previo.
Al consultar Cuotas del cliente se mostró siguiente pago 24.500 y saldo 59.000,
con firma confirmada. Vista de 390 px sin desbordamiento (scrollWidth 375).
Los datos se consultan al navegar/recargar; no se implementó actualización en vivo
entre distintos navegadores. No se enviaron mensajes ni se movió dinero real.

El reverso del pago sintético restituyó el capital de 59.000 a 69.000 y la primera
cuota a 34.500. La anulación posterior conservó venta y pago revertido, liberando
el capital. Estos registros de QA se retiran al finalizar la revisión.

Se normalizaron también los espacios del formato horario del panel general,
porque el recorrido detectó la diferencia de hidratación descrita en A9.

Compilación de producción con Webpack correcta. La cuenta, las sesiones y todos
los movimientos e historial sintéticos de esta revisión fueron retirados.
Servidor local restaurado sin credenciales temporales. Sin publicación.
