# Publicación de avisos, felicitaciones y firma — 2 de noviembre de 2026

Publicación autorizada por el usuario tras revisión de firma y prueba completa en desarrollo.

## Alcance

- Avisos administrativos para nuevos clientes, ventas, pagos, pedidos y solicitudes. Sin convertir registros previos en nuevos eventos ni inventar historial.
- Ascensos manuales con felicitación corporativa y cola cifrada e idempotente; sin motor de ascensos automáticos. Porcentaje financiado, máximo y pie diferenciados, y nuevo crédito bloqueado si queda deuda.
- Firma aprobada incorporada a la configuración privada cifrada del representante mediante la API administrativa existente. No se incluye la firma ni la identidad personal en archivos públicos o en Git. Solo se aplica a documentos nuevos; los documentos existentes conservan su contenido.

## Validación previa

Lint y TypeScript correctos; 534 pruebas aprobadas en 118 archivos. Build de producción webpack correcto. Se corrigió una prueba de pagos que usaba UTC en vez de la fecha de Chile al cruzar medianoche.

La prueba de ascenso en memoria generó exactamente una felicitación y un cambio histórico pese a tres repeticiones, con entrega real controlada al destinatario autorizado. Evidencia: `audits/flujo-ascenso-20261102/RESULTADO.md`. No se subieron clientes reales de nivel para probar producción.

PDF de muestra de dos páginas revisado visualmente con la firma aprobada: imagen completa, proporciones conservadas, ubicación correcta y espacio para firma presencial del cliente. No se creó una venta ni un compromiso de muestra en producción. La imagen fue reducida a 900 × 675, PNG transparente de 56.590 bytes, dentro del límite de la configuración.

## Activación

Migraciones 016, 017 y 018 aplicadas en una sola transacción en `oc_customers` y `public`. Comparación de huellas antes/después sobre clientes, ventas, cuotas, pagos, niveles, historial, compromisos y configuración: datos preservados. La columna nueva `source` se excluye de la comparación del historial; el resto se compara íntegramente. Evidencia: `audits/publicacion-ascensos-20261102/migraciones.json`.

Variable `CLIENT_LEVEL_MAIL_ENABLED=true` únicamente para producción. Desarrollo conserva bloqueo de envíos reales. El cambio de nivel dispara el procesamiento tras la respuesta; los reintentos usan la misma clave del proveedor. No se instala un calendario adicional ni se activa marketing.

Configuración de firma verificada por POST y GET administrativos HTTP 200, respuestas privadas sin caché. La razón social y RUT de la óptica coinciden con los confirmados por el usuario. Medios de pago: local y transferencia; Webpay sigue sin enlace configurado. Se preservan las condiciones existentes; la referencia del máximo fue contrastada con el [Certificado CMF 10/2026](https://www.bcn.cl/leychile/navegar?idNorma=1229045). Evidencia de configuración sin datos personales: `audits/publicacion-ascensos-20261102/firma-configurada.json`.

El estado de despliegue y comprobación pública se registra después de finalizar Vercel. Un push o un build en curso no acredita por sí solo publicación.
