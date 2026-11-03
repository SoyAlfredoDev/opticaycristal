# Auditoría del panel cliente en desarrollo

Fecha: 2 de noviembre de 2026. Alcance: código de trabajo, incluidos cambios pendientes y vista previa local; sin cambios funcionales ni publicación.

## Hallazgo principal: la vista previa no tiene enrutamiento completo

En `.cache/sidebar-preview/main.tsx` se monta `CustomerHome` directamente dentro de `CustomerShell` para cualquier dirección. `.cache/sidebar-preview/navigation.ts` devuelve siempre `/mi-cuenta` desde `usePathname` y sus métodos `replace` y `refresh` no hacen nada. `.cache/sidebar-preview/link.tsx` utiliza enlaces HTML normales. Por tanto, al abrir otra ruta en esta vista previa, la entrada vuelve a montar Inicio: la dirección puede cambiar sin que aparezca la sección solicitada. Esto coincide con la observación del navegador local en el puerto 3103, que carga `/@vite/client` y `/main.tsx`.

La aplicación Next.js tiene páginas independientes para Cuotas, Compras, Perfil, La óptica y Soporte. `CustomerShell` entrega `children` sin memorizar una página ni reemplazarla por Inicio. El fallo descrito queda explicado por la implementación de la vista previa; no se ha demostrado el mismo fallo en el enrutador Next.js de desarrollo.

**Prioridad alta:** sustituir esta vista previa por la aplicación Next.js real para validar navegación. Si se conserva para diseño, identificarla como vista aislada y no utilizarla como prueba de rutas. El arranque de Next.js intentado durante la auditoría terminó con un error de persistencia de Turbopack; falta recuperar ese entorno para una prueba de navegador completa en desarrollo.

## Mejoras válidas del código

1. **Prueba real de navegación autenticada, prioridad alta.** `CustomerShell.test.tsx` comprueba enlaces y estado activo; `CustomerDataProvider.test.tsx` cambia componentes con `rerender` y simula `next/navigation`. No prueban que pulsar un enlace cargue la página siguiente mediante Next.js. Añadir cobertura de Inicio, Cuotas, Compras, Perfil, La óptica y Soporte, regreso/avance y recarga directa, en móvil y escritorio. Los actuales archivos de `tests/e2e` cubren principalmente la web pública.
2. **Límite de espera y recuperación, prioridad media.** `CustomerDataProvider` mantiene una sola petición en `pending.current`. No tiene límite de espera: una petición que no termine impide nuevas consultas, incluidas las del temporizador, cambio de ruta y foco. `useCustomerPage` también carece de límite de espera. Añadir cancelación por tiempo y reintento visible, conservando la última información válida. Este problema puede dejar datos cargando; no explica por sí solo que Inicio aparezca en todas las rutas.
3. **Limpieza y medición, prioridad media.** Identificar claramente vistas aisladas, mantener una entrada local oficial y revisar estilos del bloque financiero anterior después de la extracción de `CustomerFinancingCard`. Confirmar referencias antes de borrar estilos. Medir la demora de cambio de pantalla por separado de la carga de datos para evitar atribuir ambas a la misma causa.

## Verificación y límites

Las pruebas de componentes comprueban estados de carga, reutilización de datos entre pantallas, actualización, aislamiento de cuenta y sesión caducada. Se ejecutó una selección de siete archivos del panel (navegación, proveedor de datos, compras/cuotas, óptica, tarjeta financiera, modal del simulador y soporte); el resultado se informa en el chat. Estas pruebas no equivalen a navegación real bajo Next.js.

No se modificaron componentes, datos de clientes ni producción. La validación completa de navegador en desarrollo queda pendiente de recuperar el servidor Next.js.

## Correcciones autorizadas y aplicadas

Después de la auditoría, el usuario autorizó corregir los hallazgos. Se recuperó el arranque de Next.js con Webpack mediante `npm run dev:clients`, se retiró el montaje fijo de Inicio de la entrada de la maqueta local (ahora redirige al servidor real), se limitaron resumen e historial a 12 segundos con recuperación y rechazo de respuestas tardías y se limpiaron selectores del bloque anterior sin referencias.

Durante la comprobación del usuario se encontró otro fallo: el servidor local rechazaba sus credenciales con 403 porque su origen configurado era el de producción. El comando de desarrollo fija ahora el origen local solo para ese proceso. Se corrigió también el mensaje engañoso del formulario: 403/503 ya no se presentan como contraseña incorrecta.

Se añadió una prueba de navegador de rutas autenticadas en móvil y escritorio, que requiere una sesión local proporcionada explícitamente. La ejecución automatizada de componentes y guardias de acceso, junto con TypeScript y lint, se registra en el chat. La prueba de navegador autenticada no se da por realizada sin una sesión local válida. Instrucciones: `docs/PANEL-CLIENTE-DESARROLLO.md`. No se publicó.

Verificación posterior: el cliente consiguió iniciar sesión tras corregir el origen local. Se comprobó con el navegador la navegación móvil y de escritorio de las cinco vistas principales, además de volver/avanzar, recarga y acceso a Soporte. Rutas y títulos coincidieron; sin errores de consola durante el recorrido. Pasaron 52 pruebas en 10 archivos, TypeScript y lint. El archivo Playwright permanece como cobertura de regresión preparada; este recorrido autenticado se ejecutó mediante control del navegador, sin exportar la sesión del cliente.
