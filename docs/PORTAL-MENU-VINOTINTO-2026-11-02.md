# Menú lateral y cabecera del portal — 2 de noviembre de 2026

Ajuste solicitado sobre `/mi-cuenta`: menú lateral vinotinto `#681c30`, logo oficial original en la parte superior sobre base blanca y eliminación de la cabecera «MI ESPACIO · CLIENTES», incluyendo sus accesos redundantes a Perfil y Ayuda. Ambos destinos siguen disponibles en la navegación.

El contenido mantiene las superficies blancas y acciones esmeralda del portal. En móvil se conserva la navegación inferior y sus áreas seguras; el menú lateral permanece oculto. El aviso institucional existente se conserva. La distribución ocupa como mínimo la altura de la pantalla sin reservar espacio para la cabecera eliminada. El estado activo del menú tiene fondo claro translúcido y marca verde; foco de teclado visible.

Validación: lint y TypeScript correctos; 13 pruebas existentes de navegación y datos del cliente aprobadas; build webpack correcto. Escenario local con componentes reales y datos ficticios a 1104 y 390 px: sin errores JavaScript ni desbordes, logo cargado, color calculado correcto, cabecera retirada y navegación móvil visible. La simulación no accede a bases ni envía correos.

Solo cambian `CustomerShell.tsx` y `ClientSpace.module.css`. No se modifica la configuración de contratos, firma, financiamiento, correo o administración.
