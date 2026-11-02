# Niveles y beneficios

La vista `/admin/clientes/niveles` muestra los cuatro niveles existentes y permite configurar sus beneficios actuales de financiamiento: porcentaje financiable (1–99 %), cupo máximo en CLP (1–1.000.000.000) y cuotas mensuales (1–4). Siempre se conserva un pie. No se crean nuevos descuentos, ascensos automáticos ni beneficios ajenos al financiamiento.

El portal, los simuladores y las nuevas ventas consultan los beneficios vigentes en `oc_client_tiers`. La página pública `/credito-directo` consulta las condiciones actuales de Start en cada solicitud; si no puede obtenerlas, muestra una indicación de consulta sin publicar importes antiguos. Las ventas, cuotas, saldos y compromisos previamente registrados conservan sus condiciones.

## Acceso e historial

Todo personal con acceso al módulo de clientes puede consultar esta vista y el historial. La edición utiliza el permiso existente `canManageCustomerCategories`, restringible con `CLIENT_CATEGORY_ADMIN_USERS` (usuarios internos separados por comas). Nunca se deriva del correo de una cuenta pública ni del usuario enviado en el formulario.

Cada guardado exige un motivo. En la misma transacción se actualizan los beneficios y se inserta un registro con nivel, nombre al momento del cambio, valores anteriores y nuevos, revisión, fecha del servidor, usuario de la sesión y clave de envío. El historial comienza con la activación de esta funcionalidad; no se reconstruyen cambios pasados sin evidencia. No hay endpoints para editar o borrar el historial; la base rechaza UPDATE, DELETE y TRUNCATE sobre su tabla.

La versión esperada detecta cambios concurrentes y solicita revisar los valores vigentes. Una clave de envío permite reintentar una respuesta incierta sin duplicar el cambio. Las ventas bloquean también el nivel usado al confirmar el cálculo. El historial admite filtro por nivel y paginación por cursor para recorrer todas las modificaciones.

## Activación

Aplicar `sql/clients/015-level-benefits.sql` antes de publicar el código, con una conexión directa y esquema de clientes explícito. Comando: `npm run db:clients:levels`, inyectando el entorno elegido; el ejecutor no selecciona automáticamente producción ni carga archivos privados. La migración agrega una revisión y una tabla de historial vacía, sin cambiar beneficios, clientes ni registros financieros.

La migración anterior 007 conserva su inicialización en instalaciones nuevas, pero deja de restablecer las cuotas predeterminadas cuando ya está instalada la revisión de beneficios. Esto evita que ejecutar nuevamente el preparador reemplace una configuración administrativa sin historial.

La interfaz usa «nivel» en fichas, simuladores, portal, mensajes y propuestas PDF. Los identificadores internos `category`, la marca `pricingPolicy: "category"` y las rutas anteriores se conservan para compatibilidad con clientes y reintentos existentes. Las categorías del catálogo de productos conservan su significado independiente.

## Verificación

Pruebas con PostgreSQL aislado: migración repetible, auditoría persistente e inmutable, rollback si falla el historial, identidad del actor, límites, reintentos, conflictos, paginación, permisos y conservación de ventas existentes. Pruebas de interfaz: edición, motivo, versión, reintentos, conflicto y consulta de historial. La página pública también prueba beneficios cambiados y ausencia de importes ficticios cuando falla su consulta.
