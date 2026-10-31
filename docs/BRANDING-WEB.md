# Óptica & Cristal — Editorial Boutique Vino & Verde

Guía flexible de la web comercial. Adaptación parcial de Inicio solicitada el 30 de octubre de 2026. Referencia: `design/editorial-boutique-20261030/mockup-inicio.png`. Complementa el skill `optica-web-branding`; no sustituye el diseño del portal privado ni la guía de redes sociales.

## Dirección visual

| Elemento | Referencia |
| --- | --- |
| Vino principal | `#681C30` |
| Marfil cálido | `#F4E7D4` |
| Verde hoja para CTA y énfasis | `#9BCB5A` |
| Texto sobre verde | `#3D0B1A` |
| Titulares | Bodoni Moda 500–600, normal e itálica |
| Texto y controles | DM Sans existente |
| Marca | Logo oficial original, sin alteraciones |

Iluminación cálida y sutil, jerarquía editorial, espacios amplios y una acción verde principal. Adaptar proporciones a cada pantalla; no copiar literalmente el raster.

## Alcance de esta adaptación

Alcance vigente: hero, categorías, ubicación, footer, cinta superior y bloque de empresas de **Inicio**. Se conservan el logo y la navegación, Vistas de la óptica y sus fotografías, ambas franjas originales de servicios, páginas interiores y portales privados. La ampliación a cinta y empresas fue solicitada después de la primera revisión.

El hero de Inicio es la excepción a la fotografía de producto sobre piedra de la referencia general: **sin roca, pedestal ni lentes de producto**. Fondo vino con profundidad en una capa fija; titular «Ver bien. Sentirse bien.», descripción y botones fijos; modelos transparentes en una capa independiente. No usar el 80% ni convertir Inicio en una promoción de crédito.

## Implementación

- `HomeHero.module.css`: fondo CSS fijo y tipografía local; sin animar texto o fondo al cambiar los modelos.
- `HeroPortraits` y sus dos PNG originales se reutilizan. Se mantiene la precarga de la primera imagen, carga anticipada de la segunda y selección exclusiva de imágenes listas. Intervalo original: 5.200 ms; fundido abreviado a 320 ms para evitar rostros superpuestos durante mucho tiempo. En Inicio, la rotación es automática y no hay controles visibles, según la revisión del usuario; el componente conserva controles opcionales para otros usos. Se respeta movimiento reducido.
- `EditorialHome.module.css`: tokens aplicados exclusivamente a los contenedores de categorías, ubicación, empresas y footer de Inicio.
- `editorial-font.ts`: Bodoni Moda mediante Next Font, asignada solo a las secciones editoriales. Las demás áreas conservan Cormorant Garamond y DM Sans.
- `HomeVisitSection` y `HomeFooter` envuelven los componentes compartidos sin modificarlos. Las páginas interiores conservan sus componentes y estilos predeterminados.
- Se conservan las categorías, sus imágenes referenciales, galería, textos y enlaces. Se añade WhatsApp al hero junto a Explorar lentes.
- No modificar `Site.module.css`, el registro compartido de fuentes ni los tokens del contenedor de toda la página para ampliar este estilo.

## Revisión de esta entrega

- Lint, TypeScript y 346 pruebas aprobadas en el proyecto local actual; compilación local de producción aprobada.
- Móvil de 390 px: ambos modelos mantienen los lentes visibles, botones legibles y sin desbordamiento horizontal. También se revisaron 320, 768 y 1440 px.
- Carrusel: comprobados cambio automático sin controles y preferencia de movimiento reducido; en esta última se detiene la rotación y desaparece la transición.
- Fondo, titular y altura del hero permanecen estables entre modelos. Se mantienen proporciones mediante `object-fit: contain`.
- Categorías: apertura, navegación y cierre del modal; consulta por WhatsApp conservada.
- Ubicación: mapa cargado con Huérfanos 713, Local 18; enlaces de Maps, indicaciones y WhatsApp conservados.
- Áreas protegidas: logo, navegación y galería conservados. La cinta superior ahora es amarilla con texto rojo, por petición expresa. Franjas con sus direcciones originales y duraciones de 72 y 84 segundos.
- Contraste de los tokens: texto vino oscuro sobre verde 8,79:1; marfil sobre vino 9,58:1; texto secundario sobre marfil 5,95:1. La iluminación del fondo se mantiene tenue.
- Se conserva el enlace local preexistente a Mi cuenta; se actualizó la prueba de navegación para contemplarlo. No se eliminan otros cambios locales ajenos a esta entrega.

**Estado: solo vista previa local para revisión. No se ha publicado, desplegado ni modificado producción.**

## Ajustes tras la revisión visual

- Cinta superior amarilla `#FFE45E`, texto rojo `#AC1725`, bucle continuo de izquierda a derecha. Menciona el mes actual en español según `America/Santiago`, se comprueba cada minuto y al recuperar foco. El HTML estático no fija un mes que pueda caducar. Sin ofertas ni descuentos inventados.
- El usuario aclaró primero «100%» frente al «1000%» del comentario inicial y después precisó que ese alto debe incluir cinta, menú y hero juntos. El hero usa el espacio restante de la primera pantalla y conserva sus lentes visibles.
- Se retiraron los indicadores y el botón de pausa del hero de Inicio; las imágenes siguen rotando cada 5.200 ms.
- «También cuidamos a tu equipo» adopta Bodoni Moda, tarjetas marfil, títulos vino y CTA verdes alineados. Se conservan los textos, las imágenes, el enlace a convenios y el formulario de jornadas.
- La cinta se activa únicamente en Inicio mediante una opción de `SiteHeader`. Las páginas interiores conservan su cabecera institucional.
- Se probó el cambio automático de octubre a noviembre, la ausencia de controles y la cabecera predeterminada de páginas interiores. Verificación visual en 320, 390, 674, 768 y 1440 px, sin desbordamientos; el hero alcanzó al menos el alto de cada pantalla.

**Los ajustes continúan solo en local, sin publicar.**

## Primera pantalla completa y textura

- Cinta, menú y hero ocupan juntos una pantalla: la altura real del header se mide únicamente en Inicio mediante `ResizeObserver` y una variable CSS local. El hero resta esa altura a `100svh`, con valores iniciales de respaldo para evitar saltos al hidratar.
- La segunda sección comienza al final del primer viewport. En pantallas de altura reducida se compactan márgenes y tipografía, manteniendo visibles el titular y los dos CTA; no se fuerza un recorte de contenido si el usuario necesita más espacio.
- Textura fina de tejido/grano mediante `public/images/home/hero-wine-grain.svg`, repetible y ligera, con iluminación y trama CSS. Es fija, independiente de los modelos y sin librerías adicionales.
- Verificación visual de ocho formatos: 320×568, 390×667, 390×844, 674×880, 768×900, 1024×768, 1440×768 y 1440×900. En todos: cinta + menú + hero coincidieron con el alto de pantalla; botones dentro del viewport y sin desbordamiento horizontal.
- En 390×844, por ejemplo: header de 100 px y hero de 744 px. En 1440×900: header de 108 px y hero de 792 px.

**Resultado preparado para revisión local; no publicar ni desplegar sin una nueva instrucción.**

## Catálogo /optica · referencias aprobadas

El 30 de octubre de 2026 se aprobaron dos referencias complementarias dentro de **Editorial Boutique Vino & Verde**:

- Hero: `design/catalogo-editorial-20261030/referencia-hero-marfil.png`. Marfil cálido, titular editorial centrado, segunda línea cursiva y tres productos independientes: montura metálica redonda, sol carey y accesorios vino. Los productos enlazan con las categorías del catálogo. No reutilizar el hero vino del otro mockup.
- Cuerpo: `design/catalogo-editorial-20261030/referencia-catalogo-completo.png`. Franja compacta de beneficios, catálogo con filtros laterales y tarjetas cálidas, despacho breve, asesoría vino, ubicación funcional y footer claro.

Son una dirección flexible: adaptar proporciones, columnas, densidad y orden a contenido y dispositivo. No convertirlas en una plantilla fija ni aplicar esta variante al resto del sitio. Textos, controles y botones son HTML; fotografías y fondo son capas independientes. En móvil, los tres accesos se presentan en filas legibles en lugar de reducirlos a miniaturas.

Se conservan las seis propuestas referenciales existentes y toda su lógica de filtros/carrito/solicitudes. El 20% se comunica exclusivamente vinculado al convenio de empresa confirmado. La antigua franja «Por pocos días» no tenía fechas y se sustituye por beneficios sin inventar vigencias. No se añade pago online ni aprobación de crédito.

## Inicio · primera pantalla con servicios

La altura inicial incluye cinta mensual, menú, hero y franja animada de servicios. El hero descuenta las alturas reales de cabecera y servicios mediante variables medidas con ResizeObserver. Las dos direcciones de animación permanecen; las tipografías y espacios se compactan en pantallas cortas para conservar visibles los botones. Con movimiento reducido, se prioriza la lectura estática de todos los servicios, permitiendo el espacio que requiera el contenido.

## Ajustes solicitados en revisión · 30 de octubre de 2026

- Óptica: se retira el bloque de CTA “Explorar colección / Te ayudamos a elegir”. Los tres productos mantienen su acceso a categorías y desplazamiento accesible. La franja de beneficios pasa a vino #681C30 con texto, iconos y foco en marfil.
- Cabecera pública: se conserva solo el botón verde Mi cuenta; los menús de escritorio y móvil no repiten ese enlace. El acceso del footer permanece.
- Crédito directo: se sirve una fotografía referencial vertical independiente por debajo de 760px, con vino libre para HTML y producto en la parte inferior. Se adapta el tamaño del texto y los botones sin modificar las condiciones del crédito. El lema decorativo se reserva para escritorio para evitar superposición. Asset: /images/home/credito-boutique-movil-v1.webp.
- Validación: lint, TypeScript, 353 pruebas y compilación webpack aprobados en preview. Navegador comprobado a 320, 390, 714 y 1440px sin desbordes, con un solo acceso Mi cuenta en la cabecera y selección correcta de la imagen vertical. Sin publicar.

## Sistema público unificado · publicación autorizada 30 de octubre de 2026

`src/components/site/PublicTheme.module.css` es la fuente común de tokens y alias públicos. Se aplica mediante `data-public-site` a Inicio, Óptica, Crédito directo, Convenios, Jornadas y Privacidad. No se aplica al portal ni a administración.

| Uso | Token | Valor |
| --- | --- | --- |
| Vino / enlace legible | --oc-wine, --oc-link | #681C30 |
| Superficie cálida | --oc-ivory | #F4E7D4 |
| CTA y cifra grande sobre vino | --oc-green | #9BCB5A |
| Texto e iconos sobre verde | --oc-deep | #3D0B1A |
| Superficie neutra / campos | --oc-white | #FFFFFF |
| Texto secundario | --oc-muted | #655256 |
| Borde de controles | --oc-border | #987C71 |
| Separadores suaves | --oc-border-soft | Mezcla de vino y marfil |
| Detalle editorial existente | --oc-gold | #C7A36B |

Se utilizan solo dos superficies claras, blanco y marfil; degradados, transparencias y estados derivados mantienen profundidad. Los enlaces pequeños son vino, no verde hoja. CTA primario: verde con texto vino profundo; secundario: contorno o enlace vino. En fondos oscuros se utiliza marfil. Errores y confirmaciones tienen tokens semánticos independientes.

Fuentes: Bodoni Moda 500/600 normal/cursiva mediante un único loader existente; DM Sans para texto y controles. `fonts.ts` expone publicDisplayFont; displayFont (Cormorant) permanece para el portal privado. La raíz general conserva Outfit/Playfair para las áreas excluidas. El modal de jornadas, montado fuera de las páginas, recibe la variante pública solo en las seis rutas autorizadas.

Contrastes de referencia: texto profundo sobre CTA verde 8,79:1; vino/marfil 9,58:1; texto secundario/marfil 5,95:1. Se preservan valores, condiciones comerciales y texto legal. No se cambiaron fotografías, rutas, intervalos, velocidades o dirección de las animaciones durante la unificación.
