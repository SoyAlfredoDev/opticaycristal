# Crédito directo · Revisión visual local

Aplicación de los dos mockups del 30 de octubre de 2026: hero vino con producto referencial sobre piedra clara, tipografía Bodoni Moda, CTAs verdes y proceso sobre marfil con tres pasos y tarjeta Start.

## Condiciones conservadas
- El mockup indica 80% y seis cuotas; se muestran los límites operativos vigentes: hasta 70% y cuatro cuotas mensuales. No se modificaron las reglas ni la base de datos.
- Start: hasta 30%, tope $40.000 y una cuota mensual. Siempre con pie; correo verificado, cédula presencial y compromiso de pago.
- Registro y consulta por WhatsApp conservados. FAQ, ubicación, mapa y footer sin cambios.

## Implementación
- Solo FinancingSections.tsx, su módulo CSS y nuevo asset /images/home/credito-boutique-v1.webp. Reutiliza la fuente editorial local del proyecto.
- Imagen referencial generada sin texto incrustado, optimizada en WebP; contenido y enlaces en HTML accesible.
- Adaptación de producto y pasos para móvil. Las áreas privadas no reciben estos estilos.

## Validación
- Lint y TypeScript aprobados. 349 pruebas aprobadas. Compilación webpack aprobada.
- Revisión visual de hero y proceso en 1440px y 390px; comprobación sin desborde horizontal en 320, 768 y 1024px.
- Enlace Crear mi cuenta abrió /mi-cuenta/registro; enlaces WhatsApp revisados sin enviar mensajes.
- Copia de los dos componentes previos y manifiesto en /private/tmp/optica-credit-before-20261030.

Estado: preparado para revisión en http://localhost:3031/credito-directo. Sin commit, push ni despliegue.
