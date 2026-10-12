# Hero 3D — Óptica & Cristal

## Estado de entrega

Escena 3D real activa con dos personajes gratuitos CC0: mujer (Maya, 3,67 MB) y hombre (Sam, 3,87 MB), de Innerscene/MakeHuman. Geometría, rig y texturas reales, monturas tridimensionales ajustadas a los ojos, pose modificada con brazo flexionado. Base cilíndrica fija, suelo y fondo beige; el pedestal queda fuera del grupo que gira y cambia de personaje. La protagonista inicial es la mujer. Niño pendiente: se encontró un modelo CC0 en Meshy, cuya descarga requiere iniciar sesión. No se sustituye por un adulto reducido. Fuentes y licencias en `public/models/hero/LICENSES.md`. No se afirma calidad fotorrealista ni una tasa de FPS medida.

## Dirección y contenido

- H1: «Una nueva forma de ver y verte.»
- Descripción: «Lentes que expresan tu estilo. Atención cercana para acompañar tu salud visual en cada etapa.»
- CTA verde principal: «Explorar lentes», a `/optica`.
- CTA secundario delineado verde: «Agenda tu atención», al WhatsApp oficial con mensaje prellenado. No confirma una reserva por sí solo.
- Tipografía Cormorant Garamond / DM Sans, marfil, vino y beige, verde CTA #245C4A.
- Escenario de retrato vertical, base fija y luz suave de estudio. Solo un personaje visible; secuencia mujer → hombre → niño cada 3800 ms, con salida/entrada GSAP y seguimiento de cursor de ±12,6°.

## Archivos necesarios para el artista 3D

| Archivo propuesto | Contenido |
| --- | --- |
| public/models/hero/child.glb | Niño, busto realista, expresión natural, lentes ópticos modernos completos |
| public/models/hero/woman.glb | Mujer, busto realista, lentes ajustados a nariz y orejas |
| public/models/hero/man.glb | Hombre, busto realista, lentes ópticos completos |

Cada GLB debe contener geometría real, UV y texturas incrustadas PBR: base color, roughness y normal. Piel y cabello naturales; lentes transparentes con reflejos moderados; montura y patillas como mallas separadas, sin intersecciones. No usar planos con fotos, billboards ni rostros pintados sobre geometría plana. Figura posando o busto, mirando +Z, eje Y arriba, altura total 1,8 unidades, transformaciones aplicadas. La base del modelo se alinea en Y=-0,82 sobre el pedestal mediante Center bottom. La cámara actual está a Z=3,5 y FOV=35°; los tres personajes deben mantener escala y encuadre equivalentes.

Presupuesto objetivo, por validar en dispositivos reales: 25–50 mil triángulos por busto, máximo 6 materiales, texturas de 1024–2048 px y GLB hasta 3 MB por persona. Preferir GLB sin Draco para evitar dependencias de decodificación remota en esta integración; Meshopt puede estudiarse durante la entrega. No hacen falta esqueletos para el giro del busto actual. Para animación facial o giro independiente de cabeza habrá que entregar rig y clips adicionales.

Entregar fuente editable, licencia comercial, atribución si corresponde, y permiso explícito para distribución del GLB en una web pública (el archivo descargable es accesible al visitante). Una licencia para imágenes renderizadas no implica permiso para publicar el modelo.

Fuentes investigadas para selección/adaptación, sin compras realizadas ni licencia de redistribución confirmada:

- https://renderpeople.com/3d-people/ — personas escaneadas; requiere seleccionar tres retratos compatibles, ajustar lentes y optimizar/exportar.
- https://renderpeople.com/3d-people/bundle-kids-posed-002/ — colección infantil, pendiente encuadre y licencia web.
- https://humano3d.com/single-posed-3d-people/ — personas adultas escaneadas; pendiente selección y licencia web.

## Comportamiento móvil y accesibilidad

Arrastre horizontal sobre el escenario: giro limitado. Scroll vertical permitido mediante `touch-action: pan-y`. Tocar el escenario o elegir un personaje pausa la secuencia; botón de reproducción para reanudar. No giroscopio ni permisos del dispositivo. Botones de mínimo 44 px y selección por teclado con estado `aria-pressed`. Preferencia de movimiento reducido: vista estática, selección manual sin transición ni seguimiento.

Pantallas menores de 900 px y equipos con 4 núcleos o menos: DPR 1 y postprocessing desactivado. Escritorio: DPR máximo 1,5, Bloom sutil y Vignette; PerformanceMonitor permite bajar calidad. Render por demanda, suspensión fuera del viewport, temporizador detenido en pestañas ocultas. Error de WebGL/modelo: composición de marca sin imagen sustitutiva.

## Activación y aceptación pendiente

1. Completar el GLB infantil pendiente y ajustar sus lentes, pose y escala. Los dos adultos ya están en `public/models/hero/` y configurados en `characters.ts`. Para repetir su optimización: `node scripts/optimize-hero-models.mjs` usando las fuentes originales descargadas en `.cache/hero-models/`.
2. Ajustar encuadre, materiales y luces con los modelos finales. Verificar que no se corta cabello/montura en móvil y escritorio.
3. Validar transiciones completas, selección rápida, pausa/reanudación, touch, teclado, movimiento reducido y cambio de visibilidad.
4. Medir carga, memoria y FPS en móvil real; ajustar presupuesto y texturas con esos resultados.
5. Validar pérdida de contexto WebGL, GLB corrupto, desconexión y ruta inexistente. Confirmar que los CTA siguen utilizables.

Referencias técnicas: https://r3f.docs.pmnd.rs/advanced/scaling-performance y https://react-postprocessing.docs.pmnd.rs/introduction.
