# Configuración Resend — 12 de octubre de 2026

## Cambios realizados

- Dominio existente opticaycristal.cl: envío habilitado; SPF/DKIM previamente verificados y preservados.
- DMARC público comprobado: p=reject, sp=reject; no se modificó.
- Configurado subdominio personalizado links con seguimiento de clics y aperturas habilitado en Resend.
- Añadido en cPanel de la zona opticaycristal.cl un único CNAME: links.opticaycristal.cl. → links2.resend-dns.com, TTL 300. Se comprobó que no había registro con ese nombre. No se modificaron appsfly.cl ni appsfly.app.
- Se solicitó verificación del dominio en Resend. La propagación y el certificado de tracking necesitan confirmación posterior antes de marcarlo operativo.
- Configuración local en .env.local: remitente y reply-to contacto@opticaycristal.cl, nombre de marca Óptica & Cristal, dirección Huérfanos 713 local 18 Santiago Centro, referencia del dominio Resend. La clave de API anterior se conserva.
- RADAR_RESEND_TRACKING_READY=false hasta verificar DNS. RADAR_MARKETING_ENABLED=false; no se enviaron correos.

## Webhook pendiente

No existía ningún webhook en la cuenta. El Radar está probado en localhost y no hay una URL pública declarada. No se creó un webhook dirigido a una ruta inexistente ni un túnel que exponga el panel privado. Para finalizar se necesita el origen HTTPS donde se publique este proyecto; endpoint: /api/radar/resend/webhook. Crear con los eventos del manual RADAR-CRM-MARKETING.md y guardar el secreto únicamente en variables del servidor.

La recepción de aperturas/clics por Neon no se considera verificada hasta configurar ese endpoint público. No hubo envíos a contactos reales, publicación de la app ni ampliación de permisos de la clave existente.

## Comprobación DNS autoritativa

Los servidores dns2, dns3 y dns4.servidoresph.com ya responden links.opticaycristal.cl → links2.resend-dns.com. Resend todavía muestra verificación en curso. No se marca el tracking del Radar como listo hasta confirmar el estado del proveedor.

## Estado final confirmado

Resend confirmó dominio verified, DKIM y SPF verified, Tracking CNAME verified, openTracking=true y clickTracking=true. Se actualizó RADAR_RESEND_TRACKING_READY=true. RADAR_MARKETING_ENABLED continúa false. Únicos valores pendientes para conectar el Radar: RADAR_PUBLIC_URL y RESEND_WEBHOOK_SECRET. No se enviaron correos. Los apartados anteriores de verificación pendiente describen el estado durante el proceso y quedan superados por este cierre.
