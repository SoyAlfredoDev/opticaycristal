# Preparación de publicación — 29 de octubre de 2026

Estado: migraciones y configuración productiva completadas. Candidato local
preparado y probado; no se publicó código ni se reasignó el dominio.

## Destino y alcance

- Cuenta indicada: opticaycristal.cl@gmail.com; equipo optica-y-cristal.
- Proyecto opticaycristal, dominio https://opticaycristal.cl.
- Base del candidato: main de SoyAlfredoDev/opticaycristal, commit
  33df11691ac828fd4bb171896dd91f1d9aad43ca, que es la versión pública revisada.
- Candidato construido en /private/tmp/optica-production-release-20261029.
- Incluye portal de clientes, ventas/financiamiento, seguridad del personal,
  correos de seguridad en texto, acceso a Clientes desde administración,
  migraciones y dependencias. Conserva la web y CRM del repositorio conectado;
  otros cambios locales no forman parte de este candidato.

## Base de datos y variables

Se configuró CLIENT_DATABASE_URL explícitamente como Secret de Production para
usar la base existente optica_web_db. La conexión general de la web sigue intacta.
Las otras cuatro variables ya configuradas son CLIENT_AUTH_SECRET, CLIENT_DATA_KEY,
CLIENT_APP_URL y CLIENT_DATABASE_SCHEMA. Las dos claves nuevas se guardaron como
Secret; URL https://opticaycristal.cl y esquema oc_customers son Config. Ninguna
variable del módulo se asignó a Preview ni Development.

La inspección anterior no encontró oc_customers. Se aplicaron 001-customers.sql,
002-sales.sql y 003-audit.sql al esquema nuevo, sin importar datos desde el esquema
de revisión. Resultado: 15 tablas y niveles Start, VIP, Premium y Elite con las
reglas aprobadas. No se crearon clientes ni ventas permanentes. Una prueba SQL
transaccional confirmó el saldo inicial cero y el rechazo de saldo negativo;
ROLLBACK eliminó el registro sintético. No se afirma un respaldo completo de otras
áreas: esta migración crea el esquema nuevo y no modifica sus tablas.

Registros sin datos personales ni credenciales:
- clients-production-preflight-20261029.json
- clients-production-migration-20261029.json
- clients-production-smoke-20261029.json

## Pruebas

- Árbol de trabajo original: lint, TypeScript y 222 pruebas pasaron.
- Candidato sobre el repositorio conectado: lint, TypeScript y 229 pruebas en
  51 archivos pasaron. Incluye las pruebas anteriores de ese repositorio.
- Compilación optimizada Next.js 16.4.3 con webpack: correcta. Se necesitó acceso
  de red para descargar las fuentes de Google; la compilación posterior finalizó.
- 18 comprobaciones HTTP de la compilación local: portada, convenios, jornadas,
  acceso, registro, recuperación, privacidad, manifiesto, redirecciones privadas,
  APIs sin sesión, cabeceras no-store/noindex y rechazo de Origin ajeno: correctas.
- Navegador sobre la compilación local: acceso del cliente correcto, logo cargado,
  sin desbordamiento horizontal ni errores de consola en esa pantalla.
- Sin envíos de correo a terceros. Recepción real de verificación/recuperación
  pendiente de un destinatario de prueba autorizado y de la comprobación final
  del despliegue. El resultado local no demuestra funcionamiento público.

## Datos para el catálogo

Por cada producto o paquete hacen falta nombre, qué incluye/variante y costo
protegido por unidad en CLP, indicando si el costo incluye IVA. Debe ser el importe
real que se quiere cubrir con el pie: armazón, cristales, laboratorio u otros costos
que correspondan. Si dos variantes tienen costos distintos, crear productos
separados. Solo nombre y costo se guardan hoy en el catálogo; lo incluido sirve
para acordar el nombre y evitar mezclar variantes.

El precio final de venta con IVA se registra en cada venta. No se necesitan precios
fijos de catálogo. No se cargaron productos ni costos inventados.

## Para publicar

1. El catálogo real queda pospuesto por instrucción del 30/10. No bloquea publicar
   el portal; las ventas reales requieren configurar previamente sus costos.
2. Publicar el candidato preparado en el proyecto y equipo indicados, verificando
   que main no haya cambiado desde la base antes de aplicar el parche.
3. Comprobar el despliegue READY y luego el dominio, el acceso del personal y la
   recepción de correos. Probar operaciones financieras con datos aislados; no
   generar deudas reales para probar.

La configuración y migración no publican por sí mismas el portal. El candidato se
entrega como parche binario revisable sobre la base indicada; no contiene .env,
secretos, node_modules ni .next. No se cambió el historial del directorio original.

## Actualización del 30/10/2026

Se agregó la prueba aislada NTD, corregida con los datos confirmados:
venta final $45.000 IVA incluido y costo protegido $20.000, sin cargar catálogo ni deuda en producción. Cinco casos nuevos pasaron;
el candidato completo pasó 234 pruebas en 52 archivos, lint y TypeScript. No hubo
cambios al código de ejecución que requieran reconstruir el build ya comprobado.

Los dos correos autorizados de verificación y recuperación se enviaron mediante
la aplicación y se encontraron en INBOX de Gmail, con SPF/DKIM/DMARC correctos.
La recepción deja de ser un pendiente; el recorrido público de enlaces se deberá
comprobar con el despliegue. Ver PRUEBA-NTD-2026-10-30.md y sus dos registros JSON.
