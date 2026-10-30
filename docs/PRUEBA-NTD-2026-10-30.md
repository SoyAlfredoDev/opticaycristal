# Prueba de crédito NTD — 30/10/2026

Datos confirmados por el usuario: venta final **$45.000 IVA incluido**, costo
protegido ficticio **$20.000** por unidad. Esta ejecución sustituye el ejemplo
anterior de $90.000, que partía de una interpretación provisional.

La prueba crea producto, clientes y ventas únicamente en PostgreSQL aislado en
memoria. No carga el catálogo real ni genera deuda en producción.

| Nivel | Pie mínimo | Crédito máximo | Cuotas al usar el máximo |
| --- | ---: | ---: | --- |
| Start | $31.500 | $13.500 | 1 de $13.500 |
| VIP | $27.000 | $18.000 | 1 de $18.000 |
| Premium | $20.000 | $25.000 | 2 de $12.500 |
| Elite | $20.000 | $25.000 | 2 de $12.500 |

Se supone que no hay deuda previa y que el correo está verificado. Premium y
Elite quedan limitados por el costo protegido: el pie debe cubrir $20.000. Los
porcentajes de esos niveles permitirían más, pero nunca se financia ese costo.
Desglose de la venta: neto $37.815 e IVA $7.185.

## Venta Start y pagos

Se registra la venta por las funciones reales de la aplicación: pie $31.500,
crédito y cuota mensual $13.500. Repetir la solicitud no duplica la venta. El
cliente obtiene su compra y cuota sin el costo interno ni el usuario del vendedor;
otra cuenta no obtiene esa compra. Se impide otro crédito mientras quede deuda.

Un abono de $10.000 deja saldo $3.500. Repetirlo no duplica el pago; un sobrepago
se rechaza. Al pagar los $3.500 restantes, deuda cero y cupo Start $40.000.

Para Premium se verifican dos cuotas de $12.500 el 31/01/2030 y el 28/02/2030:
fechas futuras ilustrativas para probar meses consecutivos y ajuste de fin de mes.
Se verifica reverso y anulación trazables sin borrar historial. Además, el costo
se multiplica por cantidad: dos unidades cuestan $40.000 y solo permiten financiar
$5.000 de una venta total de $45.000; tres unidades impiden financiar ese total.

Las cinco pruebas específicas corregidas pasaron. Registro numérico actualizado:
NTD-CREDITO-2026-10-30.json. El código de cálculo no necesitó cambios; se ajustaron
los datos de prueba a las dos aclaraciones del usuario.

## Correos autorizados

Se enviaron exactamente dos correos, verificación y recuperación, a
opticaycristal.cl@gmail.com, identificados como prueba NTD. Se usó Better Auth y el
remitente real de la aplicación, con una cuenta temporal en memoria; no se cambió
la contraseña de ninguna cuenta real. El envío tuvo un aviso de prueba y los
enlaces se validaron automáticamente antes de cerrar esa base temporal.

Gmail confirmó ambos mensajes en INBOX, sin SPAM. SPF, DKIM y DMARC: pass. La
verificación cambió el estado del cliente sintético; el reset funcionó una sola vez,
revocó la sesión anterior y permitió acceso con la nueva contraseña sintética.
Registro sin tokens ni contraseñas: NTD-CORREOS-2026-10-30.json.

Esto confirma lógica y entrega real desde el entorno de prueba; no acredita por sí
mismo un despliegue público del portal. Sigue preparada la publicación pendiente.
La carga del catálogo real se pospone por instrucción del usuario.
