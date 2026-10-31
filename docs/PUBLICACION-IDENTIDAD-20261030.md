# Unificación pública y publicación

## Cambios
- Inicio: galería y cintas con Bodoni/DM Sans, colores oficiales, CTA Mi cuenta y franja mensual verde/vino. Se conservan fondo fijo, modelos rotativos y movimiento.
- Óptica: superficies blanco/marfil, CTA verdes, enlaces vino, filtros y ventanas de producto/carro coherentes. Datos y flujos conservados.
- Crédito directo: FAQ, ubicación, cifras y botones unificados sin modificar porcentajes, topes o cuotas.
- Convenios y Jornadas: tipografía editorial, paleta y formularios homogéneos; ajustes mínimos de titulares para mantener su encaje. Composiciones originales.
- Privacidad: tipografía y colores públicos; botón final con contraste corregido. Texto legal y contenido del footer conservados.

## Validación local
- Checkout del puerto 3031 verificado por PID y cwd: /private/tmp/optica-editorial-review-20261030.
- Seis rutas recorridas por secciones a 1440 y 390px; además 320px sin desborde. Todas las cabeceras renderizan Bodoni y la interfaz DM Sans.
- Menú, producto, carro, acordeón, foco de convenio y modal de jornadas comprobados. No se enviaron solicitudes ni se abrieron conversaciones de WhatsApp.
- Las rutas privadas no tienen data-public-site ni tokens públicos: el acceso cliente conserva Cormorant y administración Playfair. Sin cambios en globals.css, RootLayout o lógica financiera.
- Comparación del artículo legal exacta y de parámetros de animación en 15 módulos: sin cambios.
- Compilación webpack aprobada con descarga de fuentes oficiales. Las pruebas completas y el SHA de publicación se registran al cerrar el release.

## Evidencias
Capturas por sección y verificaciones JSON: /Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/identidad-publica. Referencia anterior: /Users/alfredohurtado/.codex/visualizations/2026/10/19/01a15534-8d47-79f3-8215-994b700afc1a/auditoria-estilos.

## Contenido pendiente, sin alterar
En el footer antiguo de Privacidad: teléfono +56 9 0000 0000; horarios 10:00–19:00 y sábado 10:00–14:00, distintos de otras vistas; navegación hacia anclas antiguas y Términos de servicio con href=#. El correo contacto@opticaycristal.cl se conserva, sin comprobar su recepción. Estos puntos requieren confirmación de contenido aparte.

El modal antiguo enfoca inicialmente el campo honeypot; se comprobó el foco visible al seleccionar Persona responsable, sin modificar esa lógica preexistente.
