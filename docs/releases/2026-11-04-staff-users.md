# Usuarios del equipo

Base de publicación: 8824daa (conserva la API de Cris y la verificación Kapso).

- `/admin/usuarios` disponible en el menú de administradores.
- Invitaciones con correo, RUT y rol Administrador o Vendedor, enlace aleatorio de un uso y vigencia de 24 horas.
- El rol se obtiene de la invitación del servidor; no del formulario público.
- Vendedor: Ventas y Simulador. Sin gestión de usuarios, niveles, costos, anulación o reversión de pagos.
- Se conservan los accesos administrativos configurados en servidor.
- Migraciones `sql/staff/001-staff-users.sql` y `002-seller-role.sql` aplicadas al esquema de producción `oc_customers` el 3 de noviembre a las 21:23 (Chile). Restricciones y triggers comprobados; datos existentes conservados; cero correos enviados.
- La migración no publica la interfaz. Se requiere desplegar este código y comprobar `/admin/usuarios` con sesión administrativa.

Validación antes de publicar: pruebas del registro e invitaciones en PostgreSQL embebido, API con autorización/origen, menú administrativo y vendedor, TypeScript, ESLint y compilación de producción. La entrega real de una invitación requiere un destinatario autorizado; no se envían invitaciones de prueba a terceros.
