# OC-CD-DIGITAL · Versión 1 · Propuesta para aprobación

Modelo formal de compraventa a crédito directo y compromiso de pago de Óptica y Cristal Limitada. El cambio incorpora la aceptación electrónica de ambas partes y conserva la opción de firma en papel.

## Cláusula propuesta

Antes de firmar, el cliente podrá leer y descargar el contrato íntegro y su hoja resumen. En la modalidad electrónica, el representante acepta esa versión desde su cuenta interna individual y el cliente confirma su aceptación en Mi cuenta con un código de un solo uso enviado a su correo verificado. La constancia de ambas aceptaciones y sus fechas se incorpora a la copia íntegra y sustituye los espacios de firma manuscrita y fecha del documento. La óptica pone la copia a disposición en Mi cuenta y envía un aviso al correo verificado. Si se elige la firma en papel, ambas partes suscriben el ejemplar físico y se entrega al cliente una copia íntegra. Preparar, imprimir o descargar el documento no acredita la firma. La modalidad electrónica de este contrato corresponde a firma electrónica simple.

## Antes de aprobar

- Revisar la cláusula y el documento completo con el responsable jurídico.
- Revisar el PDF de muestra generado desde el registro de modelos.
- Confirmar el antecedente que acredita las facultades del representante y su cuenta individual.
- Aprobar el modelo en el registro. Usar su huella exacta para habilitar la firma digital.

## Orden de publicación

1. Aplicar la migración 019 compatible con el generador anterior y preparar el borrador en el registro.
2. Registrar la aprobación y verificar que el modelo y la configuración del contrato permiten emitir compromisos.
3. Publicar el generador y habilitar la huella y la cuenta del representante en el entorno de producción.
4. Comprobar el recorrido con una operación de prueba identificada, desde el acceso del representante hasta la copia firmada.

## Nuevo formato de dos páginas · desarrollo · 18 de noviembre de 2026

La propuesta `OC-CD-DIGITAL` versión 2 utiliza `a4-two-page-v4`. Conserva íntegramente las cláusulas de la versión 1. El formulario de modelos prepara esta versión nueva por defecto; no altera ni aprueba modelos existentes.

- Dos páginas A4 con una a cuatro cuotas, fuentes incrustadas de 13 puntos, márgenes compactos, encabezados dentro de los párrafos y resumen económico en dos columnas. La altura de minúsculas de la tipografía elegida se conserva respecto del modelo formal anterior.
- La segunda página reserva un área exclusiva para firmas y constancia de entrega. La firma electrónica incorpora allí las aceptaciones, fechas y SHA-256 del PDF original; no agrega una tercera página ni cubre cláusulas. El original emitido se conserva sin modificaciones.
- Ante datos extraordinariamente extensos que no caben, la emisión se rechaza antes de guardar un PDF incompleto. Nunca se eliminan cláusulas ni se permite una tercera hoja. Revisar la extensión de referencias y del antecedente de facultades sin omitir información necesaria.
- Las versiones anteriores conservan su diseño y su mecanismo de constancia; sus originales y ejemplares firmados no se reformatean.

No requiere tablas nuevas. Para activarlo en nuevas ventas debe registrarse y aprobarse como modelo nuevo mediante el flujo existente, y habilitar su huella exacta en `CLIENT_DIGITAL_AGREEMENT_MODEL_HASH`. Esta implementación no cambia esa configuración productiva ni registra aprobaciones en nombre del representante.

Comprobación: generación A4 de una a cuatro cuotas, documentos extranjeros, cuatro cuotas con referencias extensas, detección de desbordamiento y recorrido de aprobación, OTP, firma, reintento y lectura de original con PostgreSQL en memoria. Los correos de estas pruebas están simulados; no se modifican clientes ni firmas reales.
