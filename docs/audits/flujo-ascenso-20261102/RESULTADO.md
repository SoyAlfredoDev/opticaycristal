# Prueba de ascenso manual en desarrollo — 2026-11-02

Resultado: correcto. Sin commit, push, despliegue ni migración remota.

Se utilizó el componente administrativo real en el navegador, los servicios de cambio de nivel y cola, y una base PGlite aislada en memoria. Cuenta y administrador ficticios. No se modificaron clientes reales. Este escenario sustituye la capa HTTP de autenticación por un adaptador local; no valida una sesión real de Next.js.

- Ascenso manual de Start a Premium: HTTP 200.
- Un cambio histórico con autor `administrador.demo`, origen `manual` y estado de correo `accepted`.
- Tres repeticiones del mismo POST devolvieron la operación original (`replayed`); una sola entrada histórica, un trabajo y una invocación al transporte.
- Cupo máximo $80.000, financiamiento hasta 60%, hasta tres cuotas.
- Ejemplo de lentes de $80.000: crédito $48.000 y pie $32.000. Verificado en el HTML de la felicitación.
- Sin errores JavaScript en el navegador.

Para validar entrega real se extrajo el mensaje exacto preparado por la cola y se envió una sola vez mediante el conector Resend al destinatario de prueba previamente autorizado. Se conservó la clave de idempotencia del trabajo y se adjuntó el logo corporativo por CID. Únicas adiciones: prefijo `[PRUEBA FLUJO]` y aviso de datos ficticios. La respuesta real del proveedor se devolvió al transporte local para completar el flujo. Este puente controlado valida cola, contenido y entrega, pero no ejercita las credenciales ni la llamada HTTP del transporte productivo.

Correo del proveedor: `01a19ec9-47b8-771f-acba-44b3cbc87916`. Estado consultado: `delivered`. Confirma aceptación por el servidor destinatario; no acredita lectura ni ubicación en bandeja de entrada.

Verificación adicional: 18 pruebas de cola y plantilla aprobadas; sintaxis y lint del servidor de evaluación correctos. Las pruebas cubren saldo pendiente (cupo disponible cero), ausencia de felicitación por descenso/cambio sin efecto, repetición sin duplicados y manejo de rechazos.

Finalizada la entrega controlada, se restableció el servidor local al transporte simulado sin envíos. El envío automático de desarrollo sigue deshabilitado. Los cambios permanecen locales para evaluación.
