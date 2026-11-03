# Desarrollo y comprobación del panel cliente

Ejecutar desde el proyecto `npm run dev:clients` y abrir http://localhost:3034/mi-cuenta.

Este comando inicia la aplicación Next.js completa con Webpack y fija `CLIENT_APP_URL` en el origen local del proceso. No modifica los archivos de entorno ni la configuración de producción. Webpack evita el fallo de persistencia de Turbopack encontrado en este disco. Las conexiones de datos siguen siendo las que indique el entorno local existente: no crear ventas, enviar correos ni editar cuentas reales como pruebas de navegación.

La antigua entrada ignorada `.cache/sidebar-preview/main.tsx` redirige ahora al mismo recorrido en este servidor. Era una maqueta visual que montaba siempre Inicio y no tenía enrutamiento Next.js; no debe usarse para verificar funciones.

## Correcciones del 2 de noviembre de 2026

- Consultas de resumen e historial con límite de 12 segundos, incluida la lectura del cuerpo. Cancelan la solicitud y liberan el reintento. Conservan los datos anteriores y descartan respuestas tardías.
- Cancelación al abandonar la pantalla o cerrar sesión, sin restaurar datos de una petición abandonada.
- Acceso local con origen correcto. El formulario distingue credenciales rechazadas (401) de problemas del servicio o del origen (403/503), sin mostrar detalles internos.
- Retirados selectores sin referencias del antiguo resumen financiero: `statusLabel`, `statusWaiting`, `statusReady`, `financeMetrics` y `financeTerms`. Se conservó `balanceLabel`, que utiliza la invitación a comprar.
- Nueva prueba de navegador `tests/e2e/customer-navigation.spec.ts`: comprueba ruta, título y menú activo; volver/avanzar, recarga y acceso a Soporte, tanto en la configuración móvil como de escritorio. No crea ventas ni tickets.

## Cómo ejecutar la prueba autenticada

Se necesita una sesión local de cliente en un archivo de estado de Playwright fuera del repositorio. No guardar contraseñas ni archivos de sesión en Git.

Con el servidor anterior funcionando, definir `PLAYWRIGHT_BASE_URL=http://localhost:3034` y `CUSTOMER_E2E_STORAGE_STATE` con la ruta del archivo, y ejecutar `npm run test:e2e -- tests/e2e/customer-navigation.spec.ts`. Sin ese archivo, la prueba se omite explícitamente; una omisión no confirma navegación.

La selección de pruebas unitarias comprueba cargas pendientes, recuperación, aislamiento de sesión, historial, límites del crédito y componentes del panel. La revisión visual autenticada debe registrarse aparte de estas pruebas.

## Resultado comprobado

- 52 pruebas aprobadas en 10 archivos; TypeScript y lint de los archivos modificados sin errores.
- Navegador con sesión local del cliente: Inicio, Cuotas, Compras, La óptica y Perfil cambian tanto la URL como el título visible, usando el menú móvil y el lateral de escritorio.
- Volver, avanzar y recargar conservaron la vista correspondiente. El enlace de Perfil abrió Soporte correctamente. Sin errores de consola durante ese recorrido.
- La prueba autenticada se realizó mediante control del navegador; el archivo Playwright quedó preparado para futuras regresiones con un archivo de sesión local. No se afirma que se haya ejecutado ese archivo sin credenciales de prueba.
- Entorno local abierto para revisión. No se publicaron cambios ni se crearon ventas o tickets.
