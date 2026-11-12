# Asesor de monturas — edición de foto original

Estado: implementación local para revisión, sin publicación ni migraciones productivas. Sustituye el montaje 3D por tres ediciones independientes de la misma foto. WhatsApp y sus servicios no se modifican.

## Experiencia

El cliente del piloto elige una selfie frontal, un estilo y autoriza su envío a OpenAI. Obtiene tres propuestas, una por tarjeta, con forma, color y una explicación personal. Las imágenes aparecen progresivamente. Puede recuperar resultados y calificar de 1 a 5 con comentario opcional. El contacto por WhatsApp comunica solo la forma y el color; no adjunta la foto.

La foto se normaliza sin recortarla ni conservar metadatos. La petición pide mantener identidad, expresión, piel, ropa, encuadre y fondo, añadiendo solo la montura y sus sombras. Es una simulación: la IA puede cambiar detalles y no garantiza ajuste físico ni inventario. No se diagnostica ni prescribe graduación.

## Proveedor y biblioteca

- Texto: API Responses directa, `gpt-6-luna` por defecto, esquema cerrado, `store:false`, máximo 650 tokens de salida. Recibe solo proporciones aproximadas y estilo, no el nombre, RUT, contactos ni historial.
- Imágenes: API `POST https://api.openai.com/v1/images/edits`, `gpt-image-2`, calidad `medium`, JPEG, una salida por petición. Cada petición recibe la **misma foto original**, nunca la propuesta anterior. Resolución con lado largo 1024 y proporción aproximada a múltiplos de 16. No se envía `input_fidelity`, que este modelo no admite.
- Prompts de imagen construidos en servidor a partir de formas y colores aprobados. El cliente no puede enviar instrucciones libres, modelo, calidad, cantidad ni URL externa.
- Biblioteca versionada en `src/lib/frame-advisor/knowledge.ts`: distingue estudios, preferencias de estilo y revisión profesional de montaje. Las calificaciones se revisan como evidencia; nunca se incorporan automáticamente como instrucciones de IA.
- Las proporciones se estiman en navegador con MediaPipe alojado en el mismo dominio. El motor se descarga solo al seleccionar foto; no se utiliza 3D en los resultados.

Referencia técnica: [edición de imágenes de OpenAI](https://developers.openai.com/api/reference/resources/images/methods/edit).

## Privacidad y límites

- Sesión de cliente y lista `oc_client_frame_pilot` comprobadas en todas las rutas. Mantener únicamente la cuenta interna autorizada de Alfredo; no ampliar el piloto ni identificar permisos por nombre público.
- La foto original se transmite solo con consentimiento `photo-edit-v1`; no se almacena en el servidor. OpenAI recibe la imagen para procesarla conforme a sus políticas de API; esto no implica que OpenAI tenga retención cero.
- Las salidas se guardan cifradas (AES-GCM, propósito separado `frame-image`), sin URL pública. Se entregan con `private,no-store`, únicamente al dueño y durante 24 horas. La limpieza diaria borra el contenido cifrado vencido, con recuperación adicional al solicitar nuevas imágenes. La inaccesibilidad es inmediata al vencer; la eliminación física por cron puede tardar hasta el siguiente ciclo. Las copias de seguridad tienen su retención propia.
- El navegador conserva las fotos en memoria; no se usa localStorage ni el optimizador público de imágenes.
- 3 asesorías por cliente/día; 300 asesorías de texto al mes. Edición: 9 imágenes por cliente/día y **90 intentos de imagen mensuales globales** para el piloto. Se contabilizan también fallos ambiguos, sin reintentos automáticos que puedan duplicar gasto. Un límite de cantidad no sustituye un presupuesto monetario en OpenAI.
- Reservas transaccionales con bloqueo de base de datos: una imagen en curso por cliente. Idempotencia por asesoría + opción. Huella HMAC vinculada a la asesoría impide mezclar fotos; no permite correlacionar la foto entre asesorías.
- Entrada JSON limitada a 2,85 MB incluso sin Content-Length; imagen decodificada hasta 2 MB y 16 millones de píxeles. Solo JPEG/PNG/WebP estáticos. Salida validada, normalizada y sin metadatos. No se registran fotos, prompts con fotos ni credenciales en logs.

## Preparación para una futura publicación

1. Revisar las tres ediciones reales y aprobar su calidad con Alfredo. Aún no publicar.
2. Aplicar primero `025-frame-advisor.sql` si falta y después `026-frame-photo-edits.sql` en el esquema de clientes del entorno elegido. Ambas migraciones se prueban en PostgreSQL embebido, sin datos reales.
3. Conservar la lista de piloto actual. No insertar otras cuentas.
4. Secreto de servidor `OPENAI_API_KEY`; clave independiente de desarrollo en `.env.local`, ignorado por Git. No usar prefijos públicos ni guardar claves en documentación.
5. `CLIENT_FRAME_ADVISOR_PROVIDER=openai`, `CLIENT_FRAME_ADVISOR_MODEL=gpt-6-luna`, `CLIENT_FRAME_ADVISOR_ENABLED=true` y `CLIENT_FRAME_PHOTO_EDITS_ENABLED=true` solo tras migrar y revisar. `CLIENT_DATA_KEY` debe estar configurada.
6. Nueva limpieza protegida por `CRON_SECRET`: `/api/cron/asesor-imagenes`, cada día 16:00 UTC. Probar autorización y ejecución tras migrar. Apagar el piloto no debe impedir la limpieza.
7. Comprobar la cuenta autorizada y una cuenta fuera del piloto, recuperación, límites y expiración en el despliegue aprobado. No considerar una compilación o un HTTP 200 como prueba de generación real.

## Pruebas y revisión local

`npm run test -- src/lib/frame-advisor` ejecuta las pruebas aisladas de texto, edición, consentimiento, autenticación, propiedad, cifrado, caducidad, presupuesto, duplicados y fallos del proveedor. El proveedor se simula; no se consumen créditos ni se escriben datos productivos.

La prueba real es opt-in y usa PostgreSQL embebido, una sesión local aislada para Alfredo y la clave de `.env.local`. **No es un inicio de sesión contra la base productiva.** Solo extrae OPENAI_API_KEY del archivo; no carga credenciales de base de datos. El recorrido real de la cuenta autenticada permanece pendiente hasta disponer de un entorno de desarrollo autorizado.

1. Guardar la clave de desarrollo como `OPENAI_API_KEY` en `.env.local`, sin pegarla en chats.
2. Elegir la selfie autorizada en la revisión local para verificar sus proporciones y guardar `tmp/photo-edit-review/profile.json`.
3. Ejecutar `FRAME_ADVISOR_LIVE_REVIEW=1 FRAME_REVIEW_PHOTO='/ruta/privada/selfie.jpg' npm run test -- src/lib/frame-advisor/photo-edits.live.test.ts`.
4. La prueba ejecuta las rutas reales, genera las tres ediciones y verifica recuperación y una calificación **solo local**. Guarda resultados privados en `tmp/photo-edit-review/`, ignorado por Git. Se niega a repetir si ya existe `advice.json`, incluso ante un fallo parcial: revisar primero para evitar gastos duplicados.
5. `node scripts/review-frame-advisor.mjs` abre la interfaz real en localhost:3571. Si hay resultados reales completos, los muestra sin llamadas adicionales. Si no existen, indica claramente que usa imágenes sintéticas de prueba. No publicar ese servidor ni sus archivos privados.

La prueba de interfaz verifica carga de la selfie de Alfredo, consentimiento, tres solicitudes, guardado de calificación y ausencia de desbordes a 375, 768 y 1280 px. Esto no sustituye la revisión visual de imágenes generadas por OpenAI.

### Resultado verificado · 12 noviembre 2026

- 21 pruebas aisladas aprobadas; una prueba real opt-in aprobada con la selfie autorizada de Alfredo, tres ediciones OpenAI, recuperación de las tres imágenes y calificación en base efímera. Duración total de esa ejecución: 85 segundos; no es una garantía de latencia.
- Tipos, lint de archivos modificados y compilación Next.js con Webpack aprobados. La compilación por defecto con Turbopack se detuvo tras no mostrar avance; no se usa como evidencia de éxito.
- Interfaz revisada a 375, 768 y 1280 px con tres imágenes reales guardadas, sin desbordes ni errores JavaScript. El servidor de revisión sirve estas salidas sin nuevas llamadas facturables.
- Evidencias privadas en `tmp/photo-edit-review/`: `verification.json`, `proposal-1.jpg` a `proposal-3.jpg`, `results-desktop.png`, `results-375.png` y `results-768.png`. No se incluyen en Git ni en assets públicos.
- Pendiente: aprobación visual de Alfredo y recorrido autenticado contra un entorno de desarrollo autorizado. No se aplicó migración ni se desplegó a producción; la prueba usa una sesión simulada aislada y no acredita un inicio de sesión real.

### Calidad de la foto · revisión del 12 noviembre 2026

Investigación: [Perfect Corp Camera Kit](https://docs.perfectcorp.com/reference/makeup_vto/section/overview) documenta validación de iluminación, pose, distancia y tamaño del rostro antes de procesar; [Anyware](https://anyware.studio/) recomienda foto nítida, frontal y con luz uniforme para el probador. [YouCam Enhance](https://www.perfectcorp.com.tw/consumer/apps/yce) ofrece reconstrucción de detalles y retoque facial: no adoptamos esa vía porque el requisito del proyecto es conservar la apariencia real. No afirmamos conocer sus algoritmos internos ni copiamos sus umbrales.

Implementación propia: `photo-quality.ts` mide detalle mediante varianza del Laplaciano, precedida de un filtro ligero, sobre un recorte facial normalizado a 256 × 256 usado únicamente para análisis. El procesamiento entregado conserva el encuadre completo. [OpenCV](https://docs.opencv.org/4.x/d5/db5/tutorial_laplace_operator.html) documenta el operador y la reducción previa de ruido; los umbrales son heurísticos de este piloto, no un estándar clínico ni una garantía de calidad.

- Foto adecuada: se conserva sin filtro de nitidez.
- Desenfoque leve: máscara de enfoque moderada sobre luminancia, cambio máximo de 5 niveles por canal, sin deformar geometría ni sintetizar rasgos. No reconstruye información perdida, no elimina arrugas ni embellece. La interfaz avisa con una sola frase.
- Desenfoque fuerte, rostro demasiado pequeño o iluminación extrema: pedir otra toma con una indicación breve, antes de consultar a OpenAI. No intenta recuperar por generación los ojos ni la piel. El prompt de edición también prohíbe reconstruir detalle facial perdido; las salidas siguen siendo simulaciones, no una garantía de identidad píxel por píxel.
- Análisis y preparación se realizan en el navegador, sin llamadas pagadas ni subida de la foto. La copia preparada se envía solo después del consentimiento. Se mantienen las restricciones del servidor, la lista del piloto y sus presupuestos. La comprobación local de calidad es una ayuda de captura, no una barrera de autorización.
- Se conservan en memoria la original normalizada y la preparada; el archivo original del dispositivo no se modifica. JPEG de entrada con calidad 94, sin aumentar resolución. No se añade un servicio de mejora externo.

Verificación: 26 pruebas aisladas aprobadas (5 nuevas); prueba real de generación opt-in omitida para no duplicar gasto. Se usó la selfie autorizada de Alfredo y copias locales con desenfoques controlados: original aceptada; desenfoque 1–2 px recibe ajuste; 4–16 px requiere otra toma. También se comprobaron oscuridad extrema, consentimiento y cero solicitudes pagadas durante la selección, en móvil y escritorio. Estas pruebas no representan todos los tonos de piel, cámaras o defectos de imagen: ampliar validación durante el piloto antes de abrirlo a más clientes. Evidencia privada: `tmp/photo-edit-review/quality-calibration.json` y `quality-ui-verification.json`. Producción sin cambios.
