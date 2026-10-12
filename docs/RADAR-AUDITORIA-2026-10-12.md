# Auditoría del Radar Comercial B2B — 12 de octubre de 2026

## Objetivo y alcance

Captar registros empresariales reales, completar canales comerciales publicados, conservarlos en Neon sin duplicar identificadores o identidades demostrables y ordenar el trabajo para convenios y jornadas ópticas. Se auditó el código de búsqueda, identidad, firma, base de datos, importación, APIs, ficha, análisis y panel. No se implementaron campañas de correo ni el CRM ampliado.

## Problemas y correcciones

| Hallazgo | Corrección aplicada |
| --- | --- |
| Rubros específicos incluían `office=company` y devolvían entidades sin relación demostrable | Selectores específicos para tecnología, comercio, aseo, salud y servicios profesionales |
| Otros comparaba el español ingresado solo con valores técnicos de etiquetas OSM | También busca nombre del establecimiento, con etiqueta comercial obligatoria y escape de regex/JSON |
| Consultas regionales incompletas o fallidas no recuperaban partes disponibles | Recuperación acotada en dos subzonas, máximo de tiempo y conservación de resultados parciales con aviso; comuna opcional y comprobación contra polígono regional |
| Caché parcial quedaba seis horas y solicitudes concurrentes repetían consultas | Caché parcial de un minuto, completa de seis horas y unión de peticiones idénticas en curso |
| Se unían negocios con el mismo nombre sin demostrar que fueran una empresa | Identidad por nombre+dominio corporativo, nombre+dirección, RUT o identificador de proveedor; se excluyen dominios compartidos de redes/directorios como identidad corporativa |
| Un cambio de RUT o un resultado alternativo podía perder la relación con la ficha original | Tabla de alias de identidad/proveedor, claves únicas y guardado repetible; los registros existentes y actividades se preservan |
| Actualizar estado y nota juntos descartaba la nota; PATCH vacío podía borrar notas | Actualización conjunta y rechazo de solicitudes sin campos |
| No se extraían los contactos de webs corporativas | Consulta de hasta tres páginas HTML públicas; correos de departamentos o de la marca, teléfono chileno, redes y cifra explícita de trabajadores; evidencia con URL, fecha y cita para dotación |
| Primer ensayo de DNS protegido falló por selección automática de familia de Node | Familia IP explícita y conexión fijada a una dirección pública validada; prueba real repetida satisfactoriamente |
| Extracción inicial omitía teléfono en texto y correo con el nombre de la empresa | Reconocimiento de teléfonos chilenos sin enlace y correo de marca con dominio coincidente |
| No había prioridad útil sin una clave de IA | Reglas explicables de contactabilidad, campos faltantes y siguiente acción para la oferta óptica; la puntuación no es probabilidad de venta |
| Resumen, Oportunidades y Actividad conducían a pantallas equivalentes | Resumen con métricas reales; Oportunidades filtra su estado; Actividad consulta historial global |
| Tabla larga, operaciones sin feedback y errores ocultos tras una ficha | Paginación visual de 50, filtro y orden; guardado de todas las páginas; progreso real por lotes, cancelación, avisos dentro de la ficha, movimiento reducido y foco de diálogo |
| Solo se podía operar desde sesión de navegador | API con token opcional, permisos por operación, catálogo de capacidades y paginación para agentes; acceso anónimo rechazado |
| Body limitado solo por Content-Length y algunos payloads null podían romper endpoints | Lector con límite de bytes reales, validación de objeto JSON y guardado en lote que rechaza elementos inválidos |
| CSV exportado tenía headers que la importación no reconocía | Normalización de separadores en encabezados y protección contra fórmulas al exportar; exportación incluye dotación, fuente y modalidad |

## Evidencia de ejecución real

- Neon inicialmente contenía 83 prospectos.
- En navegador: construcción e inmobiliaria en Metropolitana de Santiago devolvió inicialmente 92 registros con aviso parcial. Se guardaron 10 identificadores nuevos y se confirmó un total de 93. Una consulta posterior completó 94 registros y añadió uno nuevo. La base terminó con 94 prospectos.
- Reguardado del mismo conjunto de 94: **0 nuevas, 94 existentes, 0 fallos**. El total siguió en 94.
- Paginación de API en páginas de 20: 94 fichas, 94 identificadores únicos, sin omisiones ni repeticiones.
- En navegador y lectura posterior desde Neon, Kipreos recibió `kipreos@kipreos.cl`, `+56227185800` y su LinkedIn corporativo desde [su página de contacto](https://kipreos.cl/contacto/). Cada campo conserva URL y fecha. Su prioridad orientativa pasó de 30 a 80 por disponibilidad de canales. No se atribuyó una dotación ausente.
- API de capacidades responde versión 2.0. Acceso sin credencial a prospectos devuelve 401. Las pruebas de permisos comprueban token correcto, token incorrecto y scope insuficiente.
- El análisis externo de IA no se ejecutó: actualmente el proveedor no está configurado. La puntuación por reglas funciona sin IA.

## Qué sigue pendiente

1. Fuente comercial adicional con licencia de persistencia y cobertura de Chile. OSM es una fuente comunitaria y no demuestra vigencia jurídica, identidad tributaria ni cobertura completa. El rubro se limita a lo que el establecimiento tiene etiquetado. Otros es una búsqueda literal, no una búsqueda semántica de toda la web.
2. La dotación sigue sin estar disponible en muchos registros. La web entrega declaraciones que pueden referirse a toda la compañía o ser antiguas; se conserva la evidencia y se pide confirmar antes de una jornada. No se inventa una cifra por rubro.
3. Conectar efectivamente el Dot/agente: configurar su clave, permisos y Nominatim propio/contratado. El servicio público restringe automatización periódica: [política de Nominatim](https://operations.osmfoundation.org/policies/nominatim/). Para múltiples procesos también se requiere rate limiting compartido y una cola durable.
4. Google Maps/Places no está conectado. Sus [políticas de almacenamiento](https://developers.google.com/maps/documentation/places/web-service/policies) requieren diseñar la integración y licencia de datos antes de persistir contenido en el CRM. No se implementó scraping de Google Maps, redes personales o páginas con acceso restringido.
5. El crawler obtiene HTML accesible, respeta robots.txt y detiene consultas ante red privada, TLS inválido, exceso de tamaño/tiempo, redirección a otro dominio o robots no comprobable. No ejecuta JavaScript, scrolling, formularios ni autenticación. Algunas webs necesitarán un proveedor autorizado de renderizado en una etapa posterior.
6. El panel sigue leyendo el inventario completo al cargar y limita tarjetas visibles; la API para agentes ya dispone de cursor. Antes de crecer a grandes volúmenes, el CRM debe paginar también en servidor y disponer de jobs y presupuestos compartidos.
7. SRE/SII conserva la consulta por RUT conocido. No se hizo una prueba con RUT real no autorizado ni se afirma que SRE identifique automáticamente la empresa del registro OSM.
8. Reconciliar manualmente sucursales/franquicias o nombres iguales sin identidad concluyente. No se fusionan solo por nombre; se necesita RUT o dominio corporativo consistente. La migración no puede reconstruir información que se hubiera descartado en búsquedas anteriores; una nueva búsqueda recupera los registros disponibles.
9. Email marketing, bajas, reputación del dominio, consentimientos/base de uso, CRM de negociaciones, ventas y ejecución durable por agentes se implementarán únicamente en la siguiente etapa autorizada.

## Dependencias y configuración

Se añadió `node-html-parser` como dependencia directa para extracción HTML. Se preservaron las credenciales y la configuración activa de `.env`, `.env.local`, Neon CLI y MCP. Se amplió solo el archivo de ejemplo de variables.

`npm audit` detectó cinco alertas high en la cadena de herramientas de desarrollo `eslint-config-next → fast-glob/micromatch/braces` (no en el parser añadido). La sugerencia automática implica bajar eslint-config-next a otra versión mayor; no se aplicó. La alerta raíz es [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), sobre patrones profundamente anidados. Debe revisarse cuando exista una solución compatible; no se reporta la auditoría de dependencias como libre de alertas.

Los límites actuales son por proceso: 12 búsquedas/minuto, lotes de 100, 20 enriquecimientos web/minuto, tres páginas y un máximo aproximado de 25 segundos por web; los DNS y las descargas tienen límites adicionales. Las búsquedas regionales pueden tardar hasta el presupuesto de recuperación y el tiempo de geocodificación. No son consultas ilimitadas ni hay garantía de encontrar todos los negocios.

Contrato para automatización: [RADAR-AGENTES.md](./RADAR-AGENTES.md).

## Cierre de verificación

- `npm run check`: lint y TypeScript correctos; 30 archivos de pruebas y 115 pruebas aprobadas.
- Tras la última corrección de conexión DNS y unión atómica de campos JSONB, se repitió el enriquecimiento corporativo: completo, correo y teléfono conservados. La paginación volvió a recorrer 94 fichas únicas.
- La consulta regional final devolvió solo tres registros parciales por disponibilidad del proveedor; se conservaron y se reguardaron con cero nuevas, tres existentes y cero fallos. No se presenta esa consulta como completa ni se borran los 94 prospectos guardados.
- Áreas geográficas excesivamente amplias requieren especificar comuna; se comprobó la validación en código/pruebas, pero no se afirma una consulta real de una región con islas.
