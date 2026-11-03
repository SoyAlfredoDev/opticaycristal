# Avisos administrativos — evaluación en desarrollo

Estado: cambios locales sin commit, push, publicación ni migraciones en producción. La versión publicada continúa en `7c0f5fa`. No se cargan datos ni se envían mensajes a clientes reales para estas pruebas.

## Diagnóstico

La campana existente solo recibía `ticket_created`, `customer_reply` y `mail_failed`. Sus avisos se generaban mediante triggers de soporte y su consulta hacía un JOIN obligatorio con tickets, por lo que no admitía otras entidades. Además, la campana y la vista completa estaban restringidas al permiso de clientes, aunque pedidos y solicitudes del sitio pertenecen también al panel general.

La lectura ya era independiente por administrador y se conserva. La consulta se actualiza cada minuto con la pestaña visible, al volver al panel, abrir la campana o pulsar Actualizar. No se agregaron notificaciones del sistema operativo, sonidos ni correos.

## Eventos y significado

| Evento confirmado | Aviso | Destino |
| --- | --- | --- |
| Nueva fila de cliente tras el registro | Nuevo cliente registrado | Ficha del cliente |
| Venta guardada por administración | Nueva venta registrada | Compra en la ficha |
| Pago guardado con capital o interés recibido | Pago recibido | Compra asociada |
| Pedido del carro guardado | Nuevo pedido web | Pedido en el panel |
| Solicitud de jornada/convenio guardada | Nueva solicitud de jornada/convenio | Solicitud en el panel |
| Ticket, respuesta del cliente o correo fallido de soporte | Avisos existentes de soporte | Conversación |

Una solicitud de pedido no equivale a una compra pagada. La venta es un evento de registro, no un aviso de liquidación total. Una condonación sin dinero recibido no se anuncia como pago. Los reintentos con las claves existentes y las actualizaciones del mismo registro no generan otra captura. Las referencias cortas de los avisos identifican registros; no son folios tributarios.

La captura ocurre en la misma transacción que el registro fuente: rollback de la operación implica rollback del aviso; un fallo al guardar el aviso impide confirmar una captura incompleta. Se conservan los eventos de soporte y los estados de lectura existentes. Las migraciones nuevas no convierten clientes, ventas o pedidos antiguos en eventos nuevos.

La bandeja permite filtrar clientes, ventas/pagos, pedidos, jornadas/convenios y soporte, además de Todas/Sin leer. El personal sin permiso del módulo de clientes solo recibe pedidos web y solicitudes. Ese mismo alcance se comprueba al marcar avisos como leídos; no basta con ocultarlos en la interfaz. Los avisos no incluyen RUT, correos, teléfonos, cuerpos de conversaciones ni direcciones.

## Evaluación local aislada

Ejecutar `npm run dev:notifications` y abrir http://127.0.0.1:3102.

La herramienta inicia PGlite en memoria y Vite únicamente en loopback. Usa el servicio real `src/lib/admin/notifications.ts`, las migraciones SQL y los componentes reales de campana/bandeja. La barra superior es una herramienta de prueba; sus botones insertan escenarios sintéticos en las tablas aisladas. La autenticación por selector A/B y el modo de alcance limitado son exclusivos de esta herramienta; la API de la aplicación continúa usando la sesión interna real.

Se pueden generar clientes, ventas, pagos, pedidos, solicitudes y mensajes de soporte; luego verificar contadores, filtros, enlaces y lectura por usuario. Las rutas de destino se muestran como referencias dentro de la evaluación; no se abren fichas reales. El estado se mantiene mientras viva el servidor y se borra al reiniciarlo. No lee `.env`, no utiliza conexiones PostgreSQL externas, no llama Resend y no apunta al sitio público. Los archivos generados se guardan en `.cache`, fuera del control de versiones y de las validaciones de código fuente.

## Integración con la aplicación y activación futura

- `016-business-notifications.sql` amplía la tabla existente y captura clientes, ventas y pagos.
- `017-website-notifications.sql` conecta las tablas PostgreSQL del sitio a esa misma tabla de avisos mediante triggers entre esquemas de una misma base.
- `WEBSITE_DATABASE_SCHEMA` selecciona un esquema web aislado para desarrollo. Si no se define, el almacenamiento web conserva `public`, como antes. No se cambia ninguna variable del entorno actual.
- El ejecutor `npm run db:notifications:dev` exige `ADMIN_NOTIFICATIONS_TARGET=development`, esquemas explícitos y conexiones de clientes/web a la misma base. Rechaza `NODE_ENV=production`, `VERCEL_ENV=production`, `oc_customers` y `public` antes de conectar. No carga archivos de entorno automáticamente ni se ejecuta durante build/dev.
- Los esquemas y tablas base de desarrollo deben existir antes de ese ejecutor. La evaluación aislada ya los prepara sin infraestructura externa.
- La integración web corresponde al almacenamiento PostgreSQL/Neon configurado en este proyecto. Los almacenes alternativos MySQL/archivo conservan su comportamiento anterior, pero no reciben estos nuevos triggers; no debe presentarse su captura como implementada. No se cambia automáticamente su persistencia.
- Antes de una publicación futura: revisar esta evaluación, seleccionar un destino autorizado, preparar un procedimiento de migración productivo separado, comprobar tablas/permisos y probar cada flujo acordado. El ejecutor entregado está restringido a desarrollo.

## Verificación realizada

Lint, TypeScript y build webpack correctos. 511 pruebas correctas, incluidas pruebas con PostgreSQL aislado: registro público nuevo y RUT duplicado, venta/pago y reintentos, almacenes web reales, fallos de correo sin pérdida de la solicitud, rollback, migraciones repetibles, permisos y lectura por administrador. Los tests del ejecutor prueban que los destinos productivos se rechazan antes de conectar.

Navegador sobre el servidor local: siete eventos generados, aparición en la bandeja, lectura persistida, independencia A/B, alcance limitado y filtro por tipo; sin errores JavaScript ni desbordes a 1440, 390 y 320 px. Evidencia visual en la carpeta `avisos-desarrollo` de las visualizaciones de esta conversación. La validación de soporte anterior se conserva.
