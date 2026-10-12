# Publicación de la web completa

La versión pública incluye la portada renovada, catálogo de lentes, convenios, jornadas, privacidad, imágenes y navegación; el panel privado incluye solicitudes, pedidos, Radar y CRM.

## Persistencia

Con `DATABASE_URL` configurado, solicitudes y pedidos utilizan Neon PostgreSQL. Las tablas `website_requests` y `website_orders` se crean de forma aditiva, con identificadores únicos, datos JSONB e índices por fecha. Los datos del Radar se conservan en sus tablas existentes.

Se conserva la alternativa MySQL cuando no hay conexión Neon. El archivo local se usa solo fuera de Vercel; en Vercel la falta de una base configurada produce un error explícito. Los registros que existan en `data/*.json` del entorno local no se publican ni se importan automáticamente.

## Configuración

Se conserva la configuración secreta existente de producción. El dominio canónico es `https://opticaycristal.cl`. La imagen del correo se incluye explícitamente en el empaquetado de las funciones que la usan. Los errores o tiempos de espera de Resend se registran como envío sin confirmar sin perder una solicitud ya guardada.

Las campañas del CRM permanecen desactivadas mediante `RADAR_MARKETING_ENABLED=false`. Los correos transaccionales de confirmación corresponden a solicitudes reales de los formularios. No se envían mensajes a contactos reales durante la comprobación de esta publicación.

## Dependencias

Se retiró el paquete npm `git`, que no era utilizado por la aplicación. El control de versiones continúa utilizando Git del sistema.
