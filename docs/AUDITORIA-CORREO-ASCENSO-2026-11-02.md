# Auditoría del correo de ascenso — 2 de noviembre de 2026

Estado: ajustes exclusivamente locales, sin publicación ni envíos reales. Se preserva el trabajo de desarrollo anterior.

Se revisó `src/lib/clients/level-email.ts` con los skills optica-web-branding y email-best-practices y los tokens aprobados de Óptica & Cristal. La plantilla ya conservaba el logo oficial, la composición editorial y la explicación de financiamiento. Se corrigieron el verde de la cifra principal, colores del portal privado que aparecían en el cuerpo y pie de correo, y la ausencia de enlaces de contacto y cierre institucional.

Paleta aplicada: vino #681C30, marfil #F4E7D4, verde hoja #9BCB5A y vino sombra #3D0B1A, con superficies claras y grises cálidos de apoyo. Se conserva el logo original mediante la función corporativa existente y su adjunto CID. Georgia/Arial permanecen como fuentes de correo seguras, sin descargas externas. El CTA verde mantiene texto vino oscuro y el porcentaje sigue siendo el beneficio protagonista junto al tope de crédito y el pie obligatorio.

Se agregaron correo y WhatsApp oficiales enlazados y «Tu mirada, nuestra prioridad.». Se reforzaron el ancho máximo con tabla condicional para Outlook clásico, los fondos de respaldo, el preencabezado oculto y el ajuste de nombres largos. El disponible cero se muestra con un color neutro; se conserva el mensaje que bloquea otro crédito mientras exista saldo pendiente.

Validación: 18 pruebas específicas de plantilla y cola correctas; lint y TypeScript correctos. Tres variantes (normal, con deuda y nombre/monto largos) comprobadas a 1440, 390 y 320 px sin desbordes. Axe WCAG 2 A/AA y 2.1 AA ejecutado a 390 px en las tres variantes sin infracciones detectadas. No se interpreta esta comprobación automática como certificación integral de accesibilidad.

La revisión visual se hizo en Chromium. No se ejecutó una prueba de entrega ni una renderización real dentro de Gmail, Outlook o Apple Mail; la tabla condicional de Outlook fue revisada en el marcado. Se conserva la explicación de porcentaje, cupo, cuotas y pie. No se alteran las reglas de ascenso, la cola o la política de envío.

Vista local: http://127.0.0.1:3102/revision-felicitacion.html, si el servidor de evaluación está activo. Artefactos: carpeta `auditoria-correo-ascenso` de las visualizaciones de esta conversación. Evidencia: `audits/correo-ascenso-20261102/auditoria-visual.json`.
