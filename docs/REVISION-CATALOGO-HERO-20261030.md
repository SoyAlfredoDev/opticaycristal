# Revisión local: catálogo y primera pantalla de Inicio

## Resultado
- /optica: hero marfil con tres productos independientes y accesos a categorías; franja de beneficios; catálogo con filtros laterales en escritorio y desplegables en móvil; despacho, asesoría vino, ubicación con mapa real y footer claro. Estilos exclusivos de esta ruta.
- Inicio: cinta mensual + menú + hero + servicios animados forman la primera pantalla. Se compactan tamaños y espacios según el dispositivo. Con movimiento reducido se conserva la lectura estática y se permite la altura necesaria para el contenido.
- Referencias aprobadas guardadas en design/catalogo-editorial-20261030 y registradas en docs/BRANDING-WEB.md.

## Comprobaciones
- Preview: lint, TypeScript, 352 pruebas y build webpack aprobados.
- Tests de integración de interfaz cubren accesos del hero, categoría/filtros/búsqueda combinados, limpieza, ambos órdenes alfabéticos, detalle, cantidades, eliminación y persistencia. El envío se verifica con fetch simulado, incluyendo error y confirmación. No se crearon solicitudes reales.
- Navegador: filtros combinados Metal + Dorado + búsqueda redonda, detalle y cierre por Escape, carro de 1 a 2 unidades y restauración al recargar. Carro devuelto a vacío al terminar.
- Óptica sin desbordes a 320, 390, 768, 1024 y 1440px; filtros móviles plegables; botón Explorar colección lleva al título sin ocultarlo. Mapa cargado y URLs oficiales de contacto/direcciones conservadas. Preferencia de movimiento reducido comprobada.
- Inicio: la siguiente sección comienza en el borde inferior de la pantalla a 320x568, 390x667, 390x844, 714x880, 768x900, 1024x768, 1440x768 y 1440x900. Botones visibles; sin desborde horizontal.

## Alcance comercial
El catálogo conserva las seis propuestas referenciales existentes, sus datos y la solicitud para confirmar precio, disponibilidad y despacho. No añade checkout ni crédito. El 20% se limita al convenio confirmado; se retira la frase genérica “Por pocos días” sin fecha. Fotografías del hero también identificadas como referenciales.

## Capturas
- [Óptica: hero escritorio](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-hero-escritorio.png>)
- [Óptica: hero móvil](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-hero-movil.png>)
- [Óptica: catálogo escritorio](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-catalogo-escritorio.png>)
- [Óptica: catálogo móvil](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-catalogo-movil.png>)
- [Óptica: ubicación y footer escritorio](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-inferior-escritorio.png>)
- [Óptica: ubicación móvil](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-ubicacion-movil.png>)
- [Óptica: asesoría móvil](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/optica-editorial-asesoria-movil.png>)
- [Inicio: pantalla escritorio](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/inicio-hero-servicios-pantalla-escritorio.png>)
- [Inicio: pantalla móvil](</Users/alfredohurtado/.codex/visualizations/2026/10/29/01a1881f-bc6d-7e72-bf8f-f0be47d3b13d/inicio-hero-servicios-pantalla-movil.png>)

Estado: sin commit, push ni despliegue. Preview: http://localhost:3031/optica y http://localhost:3031/.
