# Mejoras del panel administrativo — 30 de octubre de 2026

Aplicación de los siete puntos autorizados de la auditoría. Se conserva el diseño claro, con verde y acentos neón discretos.

| Punto | Implementación |
| --- | --- |
| A1 · Navegación persistente | Una estructura autenticada común para Solicitudes, Clientes, Ventas, Soporte, Pedidos web, Radar B2B y Notificaciones. La ficha del cliente también conserva el menú. Ingreso y compromiso imprimible permanecen independientes. |
| A2 · Móvil | Botón de menú siempre accesible en la cabecera, panel desplegable con todas las opciones y cierre de sesión, Escape y retorno del foco. |
| A3 · Notificaciones | Campana con contador, últimos avisos y bandeja completa. Eventos: ticket creado, respuesta del cliente y correo de soporte que requiere revisión. Lectura individual o de la página revisada, independiente por administrador; sin duplicar eventos ni resolver tickets al leerlos. |
| A4 · Organización | Nombres consistentes y módulo de Clientes separado de Radar B2B. En Radar: «Empresas y contactos» y navegación comercial secundaria. |
| A5 · Listados y búsquedas | Clientes en páginas de 50, búsqueda por nombre, correo o RUT exacto mediante HMAC. Búsqueda y página se conservan al volver de la ficha; soporte conserva filtros y ticket seleccionado. Memoria transitoria en React, sin RUT en URL ni almacenamiento del navegador. Carga, vacío, error y reintento diferenciados; una búsqueda fallida no presenta resultados anteriores. |
| A6 · Permisos | Se diferencia sesión vencida de falta de permiso. Un administrador sin autorización de clientes recibe una vista de acceso restringido y puede volver a Solicitudes. El servidor mantiene las autorizaciones de los módulos y las acciones. |
| A7 · Regresión | Pruebas de navegación, impresión, búsquedas, APIs, eventos, lectura por usuario y flujos existentes de crédito, ventas, cuotas, pagos e idempotencia. |

## Verificación antes de publicar

- `npm run check`: lint, TypeScript y 345 pruebas aprobadas en 77 archivos.
- Revisión visual con los componentes reales y datos ficticios en escritorio de 1440 px y móviles de 390 y 320 px: menú completo, sin desbordamiento horizontal, cierre por Escape y foco restaurado.
- Prueba interactiva del contador, lectura individual y por página, filtro de avisos sin leer y búsqueda conservada al cambiar de vista.
- Migraciones 001–008 probadas en un esquema Neon temporal independiente. Se verificaron eventos, deduplicación, funciones con esquema explícito y separación de lecturas. Esquema temporal eliminado al terminar.
- Pruebas con PostgreSQL embebido: paginación de 55 clientes ficticios, RUT exacto, aislamiento de permisos y ninguna filtración de campos cifrados.
- La ruta temporal de revisión se retiró antes de compilar y publicar.

## Base de datos y publicación

La migración aditiva `sql/clients/008-admin-notifications.sql` se aplica antes del código nuevo con `scripts/migrate-admin-notifications.mjs`, usando el esquema privado de clientes. Crea dos tablas y disparadores de soporte; no cambia ventas, saldos, categorías, costos o usuarios. Puede repetirse sin duplicar avisos.

Los avisos se actualizan al abrir la campana, recuperar el foco y cada 60 segundos mientras la pestaña está visible. Marcar una página solo consume los avisos que se estaban revisando, sin marcar los nuevos que lleguen después. Los accesos llevan directamente al ticket, incluso al seleccionar otra notificación desde la misma vista de soporte. Leer un aviso no confirma entrega del correo ni resuelve el ticket.

Esta entrega integra notificaciones de soporte, como primera fase de la auditoría. Notificaciones de solicitudes comerciales o pedidos quedan para una siguiente ampliación. No se generan correos ni movimientos financieros reales durante las pruebas.
