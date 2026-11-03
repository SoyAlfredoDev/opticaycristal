# Ascensos, felicitaciones y explicación del financiamiento

Estado: solo desarrollo, sin commit, push, despliegue, envíos reales ni migraciones en producción. Se conserva el trabajo local anterior de avisos. HEAD sigue en `7c0f5fa`.

## Hallazgo y alcance

Actualmente el ascenso se hace manualmente desde la ficha del cliente. El servidor verifica el personal autorizado, el origen y la versión de nivel esperada; actualiza el nivel y registra quién hizo el cambio. No hay un motor de ascensos automáticos por número de compras ni otras reglas activas. El siguiente nivel del portal es informativo y no produce ascensos.

Decisiones confirmadas por el usuario el 2 de noviembre de 2026: mantener ascensos manuales y preparar el correo para una futura automatización; felicitar únicamente cuando el cliente sube de nivel; permitir el ascenso manual con deuda, informando el nuevo máximo y manteniendo bloqueado otro crédito hasta liquidar el actual. No se activan automatismos, no se felicitan descensos ni cambios sin efecto y no se envían felicitaciones por editar globalmente los beneficios del mismo nivel.

`changeCustomerCategory` es el servicio común. Admite un origen interno manual/automatic para que una futura regla automática utilice la misma validación, historial y preparación de correo. El campo del navegador no decide ese origen. La existencia de ese punto de integración no implica que se haya activado un algoritmo automático.

## Correo y entrega

La migración 018 agrega origen al historial y una cola por cambio de nivel. Ascenso, historial y correo cifrado se guardan en la misma transacción. El identificador único del cambio evita duplicados ante reintentos. El estado del correo se muestra en el historial de la ficha.

La felicitación destaca porcentaje financiable, tope del crédito, disponibilidad real, cuotas y pie. Por ejemplo, con 60 % y máximo $80.000, unos lentes de $80.000 permiten financiar hasta $48.000 y requieren $32.000 de pie, suponiendo crédito habilitado y ausencia de deuda. El crédito debe devolverse en cuotas; no es un descuento ni una compra gratuita.

Si hay un crédito activo, se informa el nuevo máximo pero el monto utilizable permanece en cero hasta liquidarlo. El correo no cambia ventas, cuotas ni capital pendiente. Si falta verificar el correo, el mensaje queda pendiente; si cambia el destinatario o el nivel antes del envío, se cancela el mensaje obsoleto. Antes del primer intento se consultan los beneficios y el saldo vigentes.

La cola conserva el cuerpo y la clave de idempotencia entre reintentos, usa una concesión temporal de trabajo y programa otro intento frente a un resultado incierto. Fuera de una ventana conservadora de 23 horas requiere revisión; un rechazo permanente no se muestra como entrega. El estado accepted significa aceptación del proveedor, no prueba de llegada a la bandeja de entrada.

El transporte real solo se habilita con NODE_ENV=production y CLIENT_LEVEL_MAIL_ENABLED=true. Desarrollo permanece bloqueado aunque existan credenciales de Resend. La ruta manual puede procesar el trabajo después de responder cuando ese envío esté habilitado; la entrada protegida `/api/admin/clientes/nivel-correos` permite un futuro programador de reintentos. No se instaló ningún cron ni se cambió Vercel en esta etapa. Las pruebas inyectan un transporte falso, nunca un destinatario real.

## Mensajes y estilo

Las tarjetas de niveles muestran primero el porcentaje del precio financiable y después el tope del monto a crédito. Inicio, siguiente nivel, bienvenida, invitación de compra, simulador, administración y página pública mantienen juntos porcentaje, tope y pie. Un bloque reutilizable ofrece el ejemplo calculado por el mismo algoritmo de financiamiento. La promoción pública consulta los porcentajes y cuotas configurados, eliminando cifras fijas del hero.

Se aplicaron optica-clientes y optica-web-branding: superficies blancas y esmeralda en el portal, acentos por nivel existentes, y estilo Editorial Boutique Vino & Verde en la web comercial y el correo. Logo original intacto. En correo se usaron fuentes seguras y tablas accesibles, versión de texto y nombres escapados, siguiendo los skills de correo y sus pautas de fiabilidad/accesibilidad. No se trasladó el fondo vino al portal privado.

## Revisión local

`npm run dev:notifications` conserva la evaluación de avisos y añade http://127.0.0.1:3102/evaluar-niveles.html. La cuenta ficticia y el historial viven en PGlite en memoria. El formulario usa los servicios reales de cambio de nivel y cola de felicitaciones; el transporte solo captura el HTML para verlo en la página. La aceptación que aparece en esa evaluación es simulada. Reiniciar borra los datos ficticios. No carga `.env`, no conecta a bases externas y el transporte Resend está sustituido por un bloqueo.

La revisión visual estática está en `/revision-ascensos.html`; las capturas y HTML revisados están en las visualizaciones de esta conversación, carpeta `ascensos-desarrollo`.

Para preparar un esquema de desarrollo de la aplicación completa existe `npm run db:clients:level-mail:dev`. Exige CLIENT_LEVEL_MAIL_TARGET=development y un esquema explícito; rechaza public, oc_customers y entornos productivos antes de conectar. No se ejecutó ese preparador contra ninguna base externa. La migración 018 requiere las tablas previas de clientes, niveles e historial.

## Verificación

Lint, TypeScript y 531 pruebas correctos. Incluyen ascenso manual y origen automático interno, ausencia de correo para descenso/no-op, rollback si falla la cola, cifrado, bloqueo de transporte real en desarrollo, disponibilidad cero con deuda, espera por verificación, dirección/nivel obsoletos, reintentos con cuerpo y clave constantes, expiración de idempotencia, errores permanentes y autenticación del procesador. El ejemplo $80.000/60 % y el límite monetario se verifican con el algoritmo real. Build webpack local correcto.

Revisión visual del correo, niveles, bienvenida y ficha administrativa a 1440, 390 y 320 px: sin desbordes horizontales, con logo y colores existentes. No se afirma entrega de correo real ni cambios de niveles en producción.

La evaluación interactiva en navegador confirmó cambio manual HTTP 200 a Premium, historial único, aceptación simulada del correo, ejemplo $80.000/$48.000/$32.000 y reintento sin duplicar. Sin errores JavaScript ni desbordes a 1440, 390 y 320 px. Evidencia: `audits/ascensos-desarrollo-20261102/evaluacion-interactiva.json`.
