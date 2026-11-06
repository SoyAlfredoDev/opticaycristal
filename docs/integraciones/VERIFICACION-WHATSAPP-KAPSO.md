# Verificación de WhatsApp mediante código saliente

Revisión: 6 de noviembre de 2026. Sustituye el flujo entrante `OC-VERIFICAR`.
WhatsApp sigue siendo **opcional para el crédito**; el correo continúa obligatorio.
No cambia categorías, cupos, pagos ni ventas.

## Recorrido

1. Con sesión de cliente, en Perfil pulsa **Enviar código por WhatsApp**.
2. El servidor resuelve el teléfono cifrado de esa cuenta. No admite otro teléfono,
   RUT, identificador de cliente ni una bandera `whatsappVerified` en el cuerpo.
3. Kapso envía una plantilla AUTHENTICATION aprobada con un código de **cuatro
   caracteres que combina letras y números**, por ejemplo `A7K2` (ejemplo ficticio).
   Se omiten I/O/0/1 para reducir confusiones.
4. El cliente escribe el código en Perfil y pulsa **Validar código**. `a7k2` y
   `A7K2` se consideran iguales. Se aceptan únicamente cuatro caracteres ASCII.
5. Si coincide con la solicitud vigente, cuenta, teléfono y plazo, se registra
   la verificación y un recibo de auditoría en una transacción. Enviar o abrir un
   mensaje no verifica el número.

## APIs privadas del portal

Todas requieren sesión propia; JSON privado sin caché. Los POST exigen mismo
origen y cuerpo máximo de 256 bytes. No son APIs públicas para Cris.

- `GET /api/clientes/whatsapp`: `{available,verified,pending}`. `pending` es null
  o `{requestId,expiresAt,resendAfterSeconds}`; permite retomar el formulario sin
  nuevo envío ni sondeo continuo.
- `POST /api/clientes/whatsapp`, cuerpo `{}`: inicia **un** envío. Devuelve
  `{verified:false,requestId,expiresAt,resendAfterSeconds}` o `{verified:true}`
  si la cuenta ya estaba verificada. Nunca devuelve el código ni el teléfono.
- `POST /api/clientes/whatsapp/confirmar`, cuerpo `{requestId,code}`: confirma.
  Devuelve `{verified:true}` exclusivamente tras comprobarlo en el servidor.

Errores: 400 entrada inválida/código incorrecto o vencido, 401 sesión ausente,
403 origen no permitido, 429 límite, 503 configuración/proveedor no disponible.
Los límites incluyen `Retry-After`; no se reflejan errores privados de Kapso.

El receptor antiguo `/api/integraciones/kapso/webhook` conserva autenticación y
acuse de recibo para compatibilidad, pero **ningún mensaje entrante verifica
cuentas**. Los desafíos históricos no se usan en las rutas de Perfil.

## Seguridad y límites persistentes

- Aleatoriedad criptográfica; un único código vigente por cuenta. HMAC del código
  ligado al UUID de solicitud, cuenta y huella del número. Nunca código plano en
  base, logs, URL, respuestas API o almacenamiento persistente del navegador.
- Vigencia **5 minutos**, **5 intentos** por código. El quinto fallo borra el hash.
  Los fallos se confirman en base, no se deshacen mediante rollback.
- Reenvío mínimo **60 segundos**. El nuevo envío invalida la solicitud anterior.
- Por cuenta **y** teléfono: **3/hora, 6/24 horas**; por IP **10/hora, 30/24 horas**;
  global **120/hora, 500/24 horas**. Ventanas fijas desde la primera solicitud.
- Confirmaciones, incluso con solicitud inválida: **15/15 min por cuenta,
  60/15 min por IP, 600/min global**. Además se aplica el máximo de cinco intentos.
- Estado: 30/min por cuenta y 120/min por IP. IPv6 agrupada por /64.
- Los contadores PostgreSQL funcionan entre instancias. La IP es señal adicional;
  no sustituye cuenta, teléfono ni corte global. No se guardan IP en texto plano.
- Reserva y consumo del presupuesto se confirman **antes** de llamar al proveedor.
  Un fallo o timeout consume presupuesto; jamás se reenvía automáticamente.
  Una entrega incierta no verifica nada y exige una nueva acción tras la espera.
- Cambio de teléfono: trigger revoca verificación y cancela tanto desafíos
  antiguos como códigos nuevos. Un cambio mientras se envía también impide
  confirmar ese código. Bloqueo de filas y recibo único evitan doble consumo.
- Solo se envían a Kapso teléfono y código, nunca RUT, correo, saldo o contraseña.
  El mensaje puede quedar en el historial normal de Kapso/WhatsApp.
- No se usan conversaciones, IA ni texto libre como alternativa a una plantilla
  no aprobada. Estos límites no gobiernan otras automatizaciones de Cris ni
  garantizan que Meta nunca aplique sus propios límites o bloqueos.

## Configuración y migración

Requiere las tablas de clientes, límites y migración 002 de integración. La nueva
`sql/integrations/004-whatsapp-otp.sql` es aditiva e idempotente. Crea una tabla
OTP por cuenta y extiende el trigger existente; no verifica clientes, no genera
mensajes y no elimina historial.

Ejecutar con conexión de clientes y esquema **explícito distinto de public**:

```sh
WHATSAPP_OTP_MIGRATION_CONFIRM=004 node scripts/migrate-whatsapp-otp.mjs
```

Variables exclusivamente de servidor (nunca `NEXT_PUBLIC_*`):

- `WHATSAPP_OTP_ENABLED=true` solo cuando la integración esté preparada.
- `KAPSO_API_KEY`: clave de envío del proyecto, distinta de los tokens de Cris.
- `KAPSO_PHONE_NUMBER_ID`: número de negocio conectado.
- `KAPSO_OTP_TEMPLATE_NAME=oc_verificacion_whatsapp_v1`.
- `KAPSO_OTP_TEMPLATE_LANGUAGE=es_CL`.
- `CLIENT_DATA_KEY`: clave existente; no rotarla con esta migración.

Desactivación: publicar configuración `WHATSAPP_OTP_ENABLED=false`. Esto no activa
el antiguo flujo inverso. La cuenta y el crédito siguen funcionando con sus
reglas vigentes. No retroceder al código antiguo con el webhook activo.

## Estado comprobado y límites de evidencia

- Kapso: plantilla `oc_verificacion_whatsapp_v1`, AUTHENTICATION, es_CL, observada
  **Approved** el 6 de noviembre de 2026.
- La pantalla API keys de ese proyecto indica **No API keys yet**. Falta conectar
  una credencial de envío antes de habilitarlo en producción. No se ha cambiado
  facturación ni contratado un plan.
- Migración 004 aplicada en producción: tabla creada y trigger ampliado; sin modificar fichas ni enviar mensajes.
- Código y pruebas preparados en `codex/whatsapp-otp-20261105`, sobre `ab89c15`.
- 704 pruebas automáticas, lint, TypeScript y compilación Next.js con webpack aprobados. Recorrido local con componentes, APIs y PostgreSQL sintético: código ingresado en minúsculas, estado verificado persistido y un recibo único.
  No confundir pruebas sintéticas, aceptación de API, entrega al teléfono y
  confirmación por el cliente. La prueba real sigue pendiente hasta configurar
  la credencial y publicar la versión exacta.

## Fuentes oficiales

- [Kapso: plantillas AUTHENTICATION y envío](https://docs.kapso.ai/docs/whatsapp/templates/authentication)
- [OWASP: OTP, vigencia, intentos y almacenamiento](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
