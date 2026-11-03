# Verificación del programa de clientes — 28/10/2026

- Implementado en el proyecto del Kingston; sin publicación ni commit. Se conservaron cambios anteriores y cuentas del personal.
- Neon: esquema aislado oc_customers_preview_20261028 creado con autorización explícita. Cuatro categorías y tablas de clientes/sesiones/límites; solicitudes, pedidos y CRM conservados.
- 181 pruebas en41archivos pasaron tanto en copia aislada como en el proyecto del Kingston.26pruebas corresponden al nuevo registro, seguridad y autorizaciones; una adicional comprueba transporte de correo de seguridad.
- TypeScript y ESLint correctos. Compilación de producción Next16.4.3 correcta. npm audit sin vulnerabilidades reportadas al instalar.
- Navegador: registro rechaza RUT inválido; login Start sin correo verificado; consulta de perfil ignora ID ajeno; cliente no accede a administración; cupo de uso0 mientras faltan verificaciones; historial vacío. Vistas de320/390/736/1024sin desbordamientos. Manifiesto standalone responde200.
- Dos cuentas sintéticas se usaron solo en el esquema de revisión y se eliminaron al terminar. Capturas identificadas como demostración en la evidencia de este chat.
- Skill optica-clientes validado y guardado tanto en el proyecto como en ~/.codex/skills/optica-clientes/SKILL.md.
- Resend: dominio opticaycristal.cl verified y sending enabled confirmado por conector. Clave local restringida a envío, sin modificarla. No se enviaron correos a terceros; recepción real aún no probada. Enlaces de seguridad en texto, sin HTML ni píxeles del tracking de marketing existente.
- WhatsApp permanece pendiente sin lógica de verificación. No hay ventas, compras, pagos ni ascensos automáticos implementados. Para utilizar financiamiento se requieren correo y WhatsApp verificados.
- Revisión local: npm run dev y http://localhost:3000/mi-cuenta/registro; administración existente en /admin y clientes en /admin/clientes. CLIENT_APP_URL local3000; no usar esas variables en un despliegue productivo sin preparar su configuración.

## Etapa de ventas y pagos — 29/10/2026

- Migración `002-sales.sql` aplicada en `oc_customers_preview_20261028`, sin publicar.
- 51 pruebas del módulo de clientes (incluida interfaz y API administrativa) pasan.
  Suite completa: 206 pruebas en 46 archivos. TypeScript y ESLint sin errores.
- Integración con PostgreSQL local aislado: producto/costo, búsqueda por RUT,
  desglose de IVA, límites, registro atómico, un crédito activo, idempotencia,
  pagos parciales, sobrepago, liquidación, snapshots y datos privados.
- Interfaz: reintentos conservan importe, fecha, confirmaciones y el mismo UUID
  aunque los campos estén deshabilitados. Dos envíos simultáneos no generan dos
  solicitudes desde el formulario. El servidor también verifica idempotencia.
- Navegador contra esquema Neon de revisión: cuenta sintética Premium con correo
  verificado y WhatsApp sin verificar; producto QA de costo 50.000; total 119.000,
  neto 100.000, IVA 19.000, pie 50.000, crédito 69.000; cuotas de 34.500 con fechas
  30/11/2026 y 30/12/2026. Pago parcial de 10.000: capital 59.000, primera cuota
  pendiente 24.500. Vista del cliente y compromiso imprimible muestran los datos.
- Vista móvil a 390px comprobada sin desbordamiento horizontal. No equivale a
  probar un dispositivo físico. Se revisó el documento en navegador y sus estilos
  de impresión; no se imprimió en papel ni se validó jurídicamente el formato.
- Cuenta, sesiones, producto y movimientos sintéticos retirados al terminar.
  No se enviaron correos ni mensajes a terceros ni se tocaron ventas reales.
- Primera fecha elegida por vendedor como supuesto comunicado al usuario,
  porque la tercera pregunta quedó sin respuesta. Las siguientes son mensuales.
- WhatsApp opcional por instrucción del 29/10. Correo verificado obligatorio para
  financiar. No hay motor de verificación de WhatsApp ni modificación de flags
  públicos. Costo interno nunca aparece en la proyección para clientes.
- Sin emisión tributaria, firma digital, anulaciones o reversos en esta versión.
- Compilación de producción `npm run build -- --webpack` correcta, incluidas las
  rutas de venta, compromiso administrativo y compromiso privado del cliente.
- Servidor de revisión restaurado a su configuración habitual en localhost:3000;
  credenciales administrativas temporales solo existieron en el proceso de QA,
  que fue detenido. La sesión de QA del personal se cerró.

## Mejoras de auditoría A1–A7 — 29/10/2026

Implementación y límites en `MEJORAS-AUDITORIA-A1-A7-2026-10-29.md`.
222 pruebas completas en 49 archivos y 66 del módulo; TypeScript, ESLint y
compilación de producción con Webpack correctos. Navegador: revisión de costos,
calendario previo, venta recuperada sin duplicar, firma, pago de 10.000,
reverso a capital 69.000 y anulación a capital cero, con historial conservado.
Cliente: próxima cuota y saldo consultados correctamente tras el pago; sin
desbordamiento a 390px. No implica actualización en vivo entre navegadores.

Migración 003 aplicada solo al esquema de revisión. Cuenta, sesiones, producto,
historial de costo y operaciones sintéticas retirados. Servidor restaurado con
configuración habitual; credenciales/secreto temporales solo existieron en el
proceso de QA, que fue detenido. Sin publicación, correos ni dinero real.

## Revisión de producción y cuenta corregida — 29/10/2026

Cuenta indicada por el usuario: opticaycristal.cl@gmail.com; equipo Óptica y Cristal.
La sesión de Chrome de ese perfil accede al proyecto opticaycristal. El conector
sigue devolviendo 403 para el alcance del equipo, pero la revisión se completó
por la sesión web autorizada, sin cambiar configuración ni revelar secretos.

- Despliegue de producción mostrado en Vercel: Ready, creado el 19/10/2026,
  fuente main de SoyAlfredoDev/opticaycristal, commit
  33df11691ac828fd4bb171896dd91f1d9aad43ca.
- En el dominio público, /mi-cuenta/ingresar devuelve página 404.
- Variables del proyecto: existen DATABASE_URL, RESEND_API_KEY y acceso interno;
  no aparecen las variables CLIENT_* del nuevo módulo. No hay variables
  compartidas vinculadas. Solo se revisaron nombres y alcance, no valores.
- Falta preparar la configuración definitiva del módulo, verificar/aplicar las
  migraciones 001–003 en su esquema productivo, cargar productos/costos reales
  y publicar la versión nueva con prueba final de correo y recorrido funcional.
- La revisión no autoriza ni realiza por sí misma un despliegue ni cambios de datos.

### Actualización: configuración autorizada y guardada

El 29/10/2026 se crearon y verificaron CLIENT_AUTH_SECRET y CLIENT_DATA_KEY como
Secret, y CLIENT_APP_URL y CLIENT_DATABASE_SCHEMA como Config, las cuatro solo
en Production. Origen https://opticaycristal.cl; esquema oc_customers. El pendiente
de variables del nuevo módulo queda resuelto para el próximo despliegue. Ver el
registro de configuración para respaldo y tareas todavía pendientes. No se
realizaron despliegues ni migraciones durante esta configuración.

### Migración y candidato de publicación completados

Las migraciones 001–003 ya están aplicadas al esquema productivo oc_customers:
15 tablas, cuatro niveles y pruebas transaccionales revertidas. Se fijó también
CLIENT_DATABASE_URL como secreto exclusivo de Production. Candidato construido
sobre 33df116: 229 pruebas, lint, TypeScript, compilación y 18 comprobaciones HTTP
correctas. La publicación pública y recepción real de correo siguen pendientes.

Registro vigente: PREPARACION-PRODUCCION-2026-10-29.md. El manifiesto
clients-production-candidate-20261029.json identifica el parche persistente,
su SHA-256 y el commit base para continuar la publicación sin reconstruir el
trabajo. El candidato no contiene secretos. El directorio original no se reseteó
ni se modificó su historial.
