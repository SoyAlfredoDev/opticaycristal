# Convenciones de frontend

Este criterio aplica a todo código nuevo y a los componentes existentes cuando se modifiquen. El sistema de diseño se aplica a `/`, `/optica`, `/convenios` y `/jornadas`.

## Arquitectura

- Next.js App Router y TypeScript estricto. Server Components por defecto; `use client` solo para estado, eventos y APIs del navegador.
- Composición en `app/page.tsx`; componentes de la vista en `src/components/home`. Contenido y contacto oficiales centralizados en `content.ts`.
- `LinkButton`, `DepthMedia` y `SectionReveal` son piezas reutilizables. Ahora viven en `src/components/site`, junto con navegación, pie, fuentes y tokens; Inicio mantiene reexports de compatibilidad.
- CSS Modules con tokens locales evita cambiar las vistas aún no aprobadas. Diseñar desde 320 px, añadir mejoras por breakpoint, usar imágenes con proporciones estables y `sizes` acordes al layout.
- Conservar los formularios y API existentes. No añadir dependencias de WebGL sin un modelo real aprobado y una alternativa estática.

## Identidad y contenido

- CTA verde bosque `#245C4A`, hover `#194334`, aprobados por el cliente.
- Vinotinto `#6B1F3A`, vino profundo `#421326`, marfil `#FBF7F2`, beige `#E9D8C8`, carbón `#242020`.
- Cormorant Garamond para titulares; DM Sans para cuerpo y controles. Usar solo el logo oficial.
- No inventar porcentajes, precios, direcciones, condiciones o disponibilidad. Las imágenes de producto generadas son referenciales y se indican como tales.
- WhatsApp `+56 9 2245 2080`; Instagram `@opticaycristal.cl`; web `www.opticaycristal.cl`.

## Interacción y accesibilidad

- HTML semántico, un H1, jerarquía coherente, nombres accesibles en controles y foco visible.
- Diálogos nativos con Escape, foco contenido y retorno al disparador. Navegación móvil con `aria-expanded`, cierre por Escape, selección y pulsación fuera.
- Animar transformaciones y opacidad. Perspectiva solo con ratón, sin interceptar scroll táctil ni actualizar estado React en cada movimiento.
- Respetar `prefers-reduced-motion` en CSS y JavaScript. Contenido visible en SSR y sin IntersectionObserver. Limpiar listeners, observers y estilos temporales.
- Cargar primero la imagen del hero; las restantes se cargan bajo demanda mediante Next Image. No iniciar animaciones perpetuas.

## Validación

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Para preparar la prueba de navegador una vez: `npx playwright install chromium`.

- Vitest + Testing Library: contenido oficial, estados, limpieza y comportamiento accesible de componentes.
- Playwright: escritorio y móvil, navegación, imágenes, galería, teclado, movimiento reducido, tamaños 320–1440 px y regresión de `/jornadas`.
- axe-core: comprobación automática de Inicio y galería; complementar con inspección manual de contraste, recortes, foco y lectura móvil.
- Nuevas funciones deben incluir pruebas de éxito, límites y estados relevantes; corregir fallos antes de entregar. No desactivar reglas para ocultar errores.
- `test-results/`, `playwright-report/`, `.next/` y `coverage/` son salidas locales ignoradas. No versionar datos, secretos o registros de solicitudes.
