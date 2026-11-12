# Asesor de monturas

El asesor aparece en Inicio de Mi cuenta solo para las cuentas incluidas en el piloto cuando está activado. La recomendación automática presenta tres estilos con colores y motivos breves. Las referencias se ilustran con formas genéricas. El cliente puede consultar por WhatsApp por una montura parecida. El enlace transmite la forma y el color elegidos.

La foto es opcional. El navegador carga MediaPipe y su modelo desde el propio dominio solo cuando se elige una foto. La foto permanece en memoria del navegador. Se envían únicamente una categoría de proporciones aproximadas y el estilo seleccionado. La base guarda el resultado y la opinión opcional. El comentario libre se cifra con la clave de datos del portal. El cliente puede abrir su última asesoría y el personal administrador puede consultar opiniones y uso mensual desde Clientes → Asesorías de monturas.

La biblioteca está en `src/lib/frame-advisor/knowledge.ts`. Distingue resultados de estudios, orientaciones de estilo y condiciones de montaje. El servidor selecciona la ficha de proporciones y preferencias pertinente antes de pedir el resultado a OpenAI. Mantener el historial de cambios de la biblioteca en Git. Una calificación aporta evidencia para evaluar cambios posteriores, sin incorporarse como instrucción para nuevas asesorías.

Las proporciones de una selfie son aproximadas. El probador representa apariencia. El ajuste físico, graduación y elección de cristales corresponden a una revisión profesional.

## Operación

1. Instalar dependencias con los scripts habilitados para copiar el motor WebAssembly de MediaPipe. El modelo está versionado en `public/asesor-monturas/`. Su origen es el [modelo oficial MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web) y su SHA-256 es `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
2. Aplicar `sql/clients/025-frame-advisor.sql` con el esquema de clientes como `search_path` y una conexión directa al entorno elegido.
3. Vincular únicamente el identificador interno del cliente autorizado en `oc_client_frame_pilot`. El permiso se comprueba desde la sesión tanto en la vista como en la API.
4. En Vercel, configurar `CLIENT_FRAME_ADVISOR_PROVIDER=vercel` y `CLIENT_FRAME_ADVISOR_ENABLED=true` solo en Production. AI Gateway usa la identidad OIDC del proyecto. Fuera de Vercel, usar `OPENAI_API_KEY` exclusivamente en el servidor. El modelo por defecto es GPT-5.4 Mini, configurable con `CLIENT_FRAME_ADVISOR_MODEL`. La [API de respuestas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs) devuelve un esquema cerrado de formas y colores.
5. Verificar en el entorno elegido una consulta de un cliente de prueba, la reapertura sin gasto y la calificación en administración.

Se reservan hasta 3 consultas nuevas por cliente al día y 300 al mes en todo el portal, en horario de Santiago. Las reservas incluyen intentos que pudieron generar gasto aun cuando el proveedor no devolvió una respuesta utilizable. Un reintento con la misma clave no genera otra llamada. La API limita también el tamaño de entrada y salida. Al alcanzar el cupo se puede seguir abriendo la última asesoría guardada.

Pruebas aisladas de sesión, origen, cuotas, persistencia y propiedad de calificaciones. Ejecutar `npm run test -- src/lib/frame-advisor/advice.integration.test.ts`. La suite usa PostgreSQL embebido y un proveedor simulado.
