# Seguridad de Óptica y Cristal · revisión del 10 de noviembre

Cambios sobre la versión de producción 932b687, preparados para revisión. No requieren migraciones.

- El panel solo permite corregir un correo sin verificar si el cliente aún no tiene contraseña. La API aplica la regla a administradores y vendedores, aunque el navegador mande un formulario manipulado. Si se corrige una ficha sin contraseña, se anulan los enlaces anteriores. Si el cliente perdió acceso a un correo de una cuenta activa, se deriva a atención presencial; el panel no sustituye unilateralmente su identidad.
- Ambos puntos de inicio de sesión del personal comparten límites persistentes por IP y por cuenta, sin CAPTCHA. Para retirar el acceso heredado, comprobar primero el acceso y recuperación de un administrador individual. Luego fijar ADMIN_LEGACY_LOGIN_ENABLED=false y volver a desplegar; también se rechazan las sesiones heredadas existentes.
- Los recorridos del cliente conservan el registro, el primer enlace de acceso y el inicio de sesión. El crédito conserva los requisitos vigentes.
- Los enlaces de acceso y el panel reciben cabeceras privadas. La CSP del panel está en modo informe, visible en la consola del navegador; no envía informes externos ni bloquea recursos. Revisar el inicio de sesión y el panel antes de aplicar una política obligatoria.

Antes de desactivar las rutas personales anteriores de Cris, migrar Kapso a las rutas firmadas en API-CRIS-CONSUMO.md y validar el adaptador con datos sintéticos. Si hiciera falta publicar primero la corrección del panel, mantener el modo anterior por un plazo breve mediante la variable de transición y programar su retiro después de la prueba.

La rotación de credenciales previamente compartidas requiere revocar la anterior en Kapso, guardar la nueva en el gestor de secretos y probar el servicio. La contraseña del cliente se reemplaza con el flujo de recuperación, que revoca las sesiones. No reutilizar las credenciales antiguas. La autenticación de dos factores para administradores se prepara como cambio separado para verificar inscripción y recuperación del equipo antes de exigirla.
