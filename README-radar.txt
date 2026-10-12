CRM Y CAMPAÑAS — versión 3.0
Implementados dentro de CRM y campañas del Radar. Manual: docs/RADAR-CRM-MARKETING.md. Envío local desactivado; falta endpoint público y webhook. Esta actualización sustituye menciones previas de email marketing como etapa pendiente.

Radar Comercial B2B — versión auditada 12-10-2026
================================================

Ubicación: /admin/radar, integrado en el panel administrativo privado.
Stack: Next.js App Router, TypeScript, Neon PostgreSQL y OpenStreetMap.

Captación implementada
- Filtros estructurados: 16 regiones, 28 opciones de rubro y comuna opcional.
- Sin filtro de trabajadores: se conservan también empresas pequeñas y sin dotación publicada.
- Overpass con límites geográficos, caché, recuperación parcial y trazabilidad. Otros busca etiquetas y nombres comerciales mediante comparación literal.
- Guardado en lotes de hasta 100 y verificación de lectura desde Neon. Claves únicas e identidades/alias evitan duplicar resultados o RUT asociados.
- Tabla filtrable, orden por prioridad/nombre y paginación visual. Guardar todos abarca todas las páginas.
- Resumen con métricas reales, prospectos por estado, oportunidades y actividad.
- Enriquecimiento web: hasta tres páginas HTML corporativas públicas; correos comerciales, teléfono chileno, redes y dotación explícita. Cada dato conserva evidencia con fecha y URL.
- Dotación ausente = por clasificar. De 1 a 4: baja escala; de 5 a 20: convenio; más de 20: candidata a convenio y jornada, sujeto a confirmación.
- Prioridad por reglas y próxima acción sin consumir IA. Análisis opcional por proveedor compatible con chat completions, basado en la oferta óptica y hechos publicados.
- SRE/SII por RUT válido conocido; notas, actividades y CSV de importación manual/exportación.
- API compartida para sesión administrativa o token de agente con permisos y paginación mediante cursor.

Configuración
- Variables activas en .env.local; se preservaron las existentes.
- Ejemplos en .env.radar-example.txt; nunca incluir secretos en el código.
- RADAR_AGENT_API_KEY vacío: agentes deshabilitados. Requiere al menos 32 caracteres y RADAR_AGENT_SCOPES.
- RADAR_AI_API_KEY, RADAR_AI_BASE_URL y RADAR_AI_MODEL: opcionales para análisis externo.
- NOMINATIM_BASE_URL propio/contratado obligatorio para búsquedas autónomas con token de agente.
- OVERPASS_API_URL y OVERPASS_FALLBACK_API_URL permiten cambiar instancias sin cambiar el panel.

Límites
- No es un censo exhaustivo ni consultas ilimitadas: la cobertura OSM y las instancias públicas varían.
- Regiones con territorios insulares o límites excesivos requieren indicar comuna; se valida contra el polígono regional.
- No se inventan contactos ni trabajadores. Una cifra corporativa puede ser antigua o global: confirmar dotación local antes de una jornada.
- Se respetan robots.txt, validación DNS/IP, TLS, tamaño, tiempos y dominio. No se ejecuta JavaScript, scrolling ni formularios.
- No hay conexión activa a Google Places, Dot, campañas de email ni CRM avanzado.
- La consulta completa del inventario del panel y límites por proceso requieren evolución antes de grandes volúmenes/distribución.

Documentación
- docs/RADAR-AUDITORIA-2026-10-12.md: hallazgos, mejoras, ejecución real y pendientes.
- docs/RADAR-AGENTES.md: autenticación, permisos, endpoints y flujo para automatización.
