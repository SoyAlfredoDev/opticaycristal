# Hero editorial por capas — 8 octubre 2026

## Limpieza de contornos vigente (v6)

Tras autorización del cliente para mejorar con IA los recortes, se editaron ambos PNG con image_gen integrado. Activos actuales: `public/images/home/hero-young-clean-v6.png` (1254×1254 RGBA, 1,66 MB) y `public/images/home/hero-couple-clean-v6.png` (1399×1124 RGBA, 2,22 MB). Inspección sobre fondo carbón para detectar halos y restos de fondo; las previsualizaciones se compusieron únicamente para revisión, sin incorporarlas a la web. Se conservaron las versiones previas.

Se sirven los PNG originales mediante Next Image con `unoptimized`: preserva la transparencia y evita una nueva codificación con pérdida. Coste: aproximadamente 3,9 MB entre las dos fotografías; no se afirma resolución 4K ni igualdad píxel a píxel de las caras después de una edición generativa. Carrusel, encuadre, fondo y accesibilidad conservan su comportamiento.

Prompt utilizado con cada imagen como objetivo de edición:

“Precise photographic alpha-matte cleanup of the attached edit target. Subject: [subject]. This is a technical cutout restoration, not a redesign or new photo. Keep the original faces, identities, expression, teeth, glasses frame shapes, lens reflections, pose, anatomy, skin texture, clothing detail and lighting. Correct the existing poor cutout: remove ALL gray/white background remnants around the hair and shoulders, colored fringe pixels, detached specks and blurry halos. Produce tightly accurate clean sharp contours on clothing, hands, elbows, with natural individual hair strands and only a narrow antialias edge, no broad feathering, no glow, no outlines, no drop shadows, no blur anywhere. Especially clean holes between arms/hair and the background around the top left hair. Fully transparent alpha background, subject opaque, no checkerboard painted into pixels. Keep both elbows/hands and existing silhouette inside the image with transparent safety margins. High resolution photographic detail, ideally 2400px long edge. Never beautify, smooth, or change faces or glasses. No scenery, no text. Only repair cutout quality.”

Sustituciones de [subject]:
- Joven: “one laughing brunette woman, black cat-eye sunglasses with gold bridge, white knit sweater, both arms bent with hands behind her head and both elbows fully visible”.
- Pareja: “the same smiling couple piggyback pose wearing black sunglasses, man in denim jacket, woman white tee, retain every existing hand and arm”.

Este apartado tiene prioridad sobre las rutas v4/v5 documentadas como historial más abajo.

## Selección vigente: fondo boutique y dos retratos

Se retiraron del carrusel la mujer sobre fondo violeta y el niño: los bordes coloreados del cabello no alcanzaban la calidad del recorte aprobado. Los archivos se conservan como versiones anteriores, pero ya no se solicitan ni se muestran en el hero. Fotografías activas: joven con suéter (`hero-young-extended-v5.png`) y pareja (`hero-professional-v4.png`), con cambio automático y pausa accesible. La foto de la pareja contiene un recorte de cabeza en el propio original; no se inventó contenido adicional.

Fondo anterior reemplazado por una fotografía real de interior de óptica con vitrinas, madera y lámparas cálidas: Juan Gomez, https://www.pexels.com/photo/interior-of-a-vintage-store-15729765/ ; licencia https://www.pexels.com/license/. Archivo local `hero-optical-boutique-v3.webp`, 2511×3759, WebP calidad 94. Es una ambientación de stock, no el local real de la marca. Encuadre CSS al 78% vertical para mostrar vitrinas y no la zona de techo vacía. El fondo sigue cubriendo el ancho completo; un velo marfil progresivo mantiene legible el texto y deja el lado de las personas más oscuro. No se generó una óptica ficticia.

Las secciones siguientes documentan el historial de versiones; la selección activa de este apartado tiene prioridad.

Reemplaza la escena de avatares en HomeHero. La biblioteca 3D anterior queda desconectada del hero.

## Diagnóstico visual
Los lentes ocupaban una fracción pequeña del personaje de cuerpo completo. Arco, pedestal y controles competían con el producto; el título largo desplazaba los CTA hacia el borde inferior del primer viewport.

## Referencias revisadas
- https://www.aceandtate.com/es — fotografía de campaña amplia, rostros y lentes protagonistas, llamada breve.
- https://www.warbyparker.com/ — producto a gran escala, titular corto y acciones de compra claras.

Se adopta el lenguaje editorial con composición propia dividida, tipografía y paleta de Óptica & Cristal. No se reutilizan fotografías ni recursos de estas marcas.

## Fotografías activas y licencia
La mujer principal, la joven y la pareja son fotografías suministradas por el cliente el 8 de octubre de 2026, con autorización expresa para recortarlas e incorporarlas. No se atribuyen autores o licencias que no fueron proporcionados. El niño y el interior proceden de Pexels, según https://www.pexels.com/license/. No son testimonios, empleados ni productos identificados del catálogo. El interior es una ambientación de stock, no se presenta como el local real de Óptica & Cristal.

| Capa | Autor | Fuente | Archivo en public/images/home |
| --- | --- | --- | --- |
| Mujer principal | Proporcionada por cliente | happy-cute-girl-with-wavy-hairstyle-touching-her-glasses-with-smile-indoor-shot-magnificent-curly-lady-white-t-shirt-posing-purple-wall.jpg | hero-woman-v3.png |
| Niño | Aslam Athanikkal | https://www.pexels.com/photo/boy-in-eyeglasses-15857898/ | hero-child-v2.png |
| Joven | Proporcionada por cliente | joyful-female-laughing.jpg | hero-young-v3.png |
| Pareja | Proporcionada por cliente | smiling-beautiful-girl-her-handsome-boyfriend-casual-summer-clothes-man-carrying-his-girlfriend-back-she-raising-her-hands.jpg | hero-professional-v3.png |
| Óptica con plantas | Daniel Maurício Bertoli | https://www.pexels.com/photo/stylish-eyewear-display-in-modern-store-38922618/ | hero-optical-store-v2.webp |

Mujer, niño y pareja conservan la fotografía original mediante segmentación y recorte. La joven del suéter tiene una ampliación generativa de brazos y ropa expresamente autorizada por el cliente después de detectar que los codos estaban fuera del original. Se solicitó conservar rostro, expresión y lentes; la edición generativa no garantiza igualdad píxel a píxel. No se afirma nacionalidad de las personas fotografiadas.

### Corrección de brazos y resolución

- Mujer: `hero-woman-v4.png`, 1449×2800, detalle RGB del original de 6720×4480; máscara calculada por separado y aplicada al original antes de reducir.
- Pareja: `hero-professional-v4.png`, 2400×1928, recorte desde el original de 5555×4166.
- Joven: `hero-young-extended-v5.png`, 1254×1254 RGBA, edición con herramienta integrada image_gen. Ambos codos visibles; la imagen se contiene dentro del ancho del escenario, con margen lateral. No se presenta como 4K.
- Prompt final: “Photographic outpainting edit, NOT a new person. Deliver a high-resolution 2048 by 2048 transparent PNG asset. Use the supplied real photo exactly for her head and face, expression, original black cat-eye sunglasses with gold bridge and reflections, teeth, skin and hair; do not redesign the face or glasses. Extend only missing white knitted sleeve fabric and both bent arms so both rounded elbows are COMPLETELY visible, original hands remain behind head. Frame the woman from top of head to waist, no jeans or legs needed. Both elbows fully inside canvas, minimum 6 percent transparent padding to left and right of elbows. Subject centered, clean accurate alpha matte including hair, no white or colored fringing or isolated alpha speckles. Preserve photographic natural texture and natural light from source, no smoothing or beautification, authentic white knit detail. Transparent background only, no text, no scene, no drop shadow. Wide comfortable silhouette with full arms; preserve original face and lenses.”
- La herramienta devolvió 1254×1254 pese a la resolución solicitada. Se mantienen los originales y las versiones anteriores para poder comparar y revertir.

Actualización con las fotos del cliente: originales de 6720×4480 (mujer), 3674×5511 (joven) y 5555×4166 (pareja). PNG transparentes de 956×1848, 2060×2800 y 2400×1929 respectivamente, sin ampliar el original. Se mantiene el niño de 1916×2400. Segmentación local del fondo; para la joven se conserva el suéter blanco mediante separación del fondo gris frío conectado al borde. Next Image con calidad 90 y archivos v3 para evitar caché anterior. Encuadres específicos por fotografía, manteniendo juntos ambos miembros de la pareja. Fondo de original 3000×4000, WebP calidad 95, sin desenfoque añadido. La capa de fondo ocupa el 100% del ancho y alto del hero en todos los tamaños; velo translúcido para contraste del texto, sin columna opaca que corte la fotografía.

## Comportamiento
HomeHero mantiene el texto en servidor; HeroPortraits es la isla cliente. Fondo estático independiente, retratos absolutos sin alterar la altura del hero. Fundido de 900 ms y desplazamiento de 24 px, ciclo de 5,2 s. Solo se seleccionan imágenes cargadas. Selección manual pausa el ciclo; botón de pausa/reanudación accesible. Se detiene fuera de pantalla, con la pestaña oculta y con prefers-reduced-motion. Limpieza de intervalos y observer al desmontar.

Móvil: retrato primero, texto después, botones apilados; no depende del hover ni de gestos. Escritorio: texto a la izquierda, retrato a la derecha. Imágenes locales optimizadas por Next Image, precarga solo de la principal. Ninguna escena WebGL ni imágenes generadas montadas en el hero.

## Comparación con el mockup aprobado
Referencia: Imagen de ChatGPT 8 oct 2026, 20_05_58.png, facilitada por el usuario. Inspección visual mediante view_image de referencia y capturas de navegador a 1440×1000 y 390×844.

1. Texto: mismo titular, bajada, eyebrow y CTA; firma equivalente con la tipografía editorial disponible.
2. Jerarquía: titular serif carbón y segunda línea cursiva vinotinto; textos legibles en ambos tamaños.
3. Capas: fotografía recortada PNG al frente; fondo independiente con exhibidores y plantas, modificación solicitada.
4. Responsive: retrato arriba en móvil, a la derecha en escritorio; sin desborde horizontal.
5. Acciones: verde #245c4a, enlaces reales a /optica y WhatsApp. Se mantienen los tres servicios.
6. Movimiento: solo cambia la persona; fondo, texto y acciones permanecen fijos. Verificada la rotación mujer→niño en navegador manteniendo la misma URL de fondo.

Desviaciones intencionales: modelo y fondo nuevos solicitados; controles de carrusel para acceso manual y pausa; cabecera funcional existente conserva Hablemos y WhatsApp verde conforme a instrucciones previas, sin añadir búsqueda o carrito decorativos. Web e Instagram permanecen en el footer.

## Validación
ESLint de los componentes modificados; TypeScript sin emisión ni caché incremental. Seis pruebas de Vitest: espera de carga, rotación/pausa/reanudación, selección manual, salto de imágenes no disponibles, movimiento reducido y pestaña oculta. Revisión en navegador de carga de las cinco imágenes y encuadres responsive.
