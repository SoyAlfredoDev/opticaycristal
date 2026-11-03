# Corrección de correos — 3 de noviembre de 2026

El usuario autorizó corregir el fallo de registro y enviar notificaciones aunque el correo del cliente todavía no esté verificado.

- El callback de seguridad de Better Auth utiliza su hook de fin de transacción: comprueba el destinatario vigente y envía después del commit. Los fallos dejan un mensaje operativo sin direcciones, tokens ni claves.
- Los ascensos y las respuestas de soporte entran directamente en cola. Los registros antiguos `unverified` pueden procesarse con la nueva política. Siguen cancelándose avisos dirigidos a direcciones anteriores o a niveles que ya no corresponden.
- Enviar notificaciones no verifica la cuenta ni habilita el crédito. El aviso de ascenso conserva disponible cero cuando la verificación o el saldo no permiten utilizar un nuevo crédito, y explica cómo proceder.
- Se conservan las claves idempotentes y las barreras contra reintentos inciertos fuera de su ventana de seguridad.
- Respaldo diario para ascensos a las 15:00 UTC, limitado a tres avisos por ejecución y protegido por `CRON_SECRET`. El primer intento sigue realizándose al guardar el ascenso. Es una recuperación diaria, no un servicio de reintento cada cinco minutos.
- Pruebas: 57 aprobadas en 10 archivos, incluidos aislamiento entre conexiones al registrarse, envío sin verificación, recuperación de avisos retenidos, destinatario cambiado, idempotencia y permisos. TypeScript y lint aprobados.

La reproducción de la regresión quedó incorporada como prueba permanente en `src/lib/clients/auth-mail-transaction.integration.test.ts`.

La comprobación de producción y la recuperación de los avisos deben registrar por separado los estados aceptado por el proveedor y entregado al servidor de destino.
