# Revisión para producción — 2 de noviembre de 2026

Base real: `04801dba1472594eead2784ad28b66a14155da4b`, rama `main` de `SoyAlfredoDev/opticaycristal`. La carpeta de trabajo tenía un Git sin historial ni remoto; se preparó la publicación sobre una copia del repositorio real, conservando sus archivos y funciones adicionales.

## Correcciones de la revisión

- Tipo explícito en la propuesta administrativa para conservar el literal `pricingPolicy: "category"` y resolver el error de TypeScript.
- Se conserva la sincronización de contactos del CRM y su priorización por correo que la copia local habría retirado, además de las rutas y pruebas existentes solo en GitHub.
- El compromiso del cliente tenía una descarga hacia una API administrativa. Ahora la página usa una API de clientes que consulta venta y documento con el usuario de la sesión. Se prueban ausencia de sesión, propiedad del documento, descarga y documento inexistente.
- Override compatible de Zod en `@vercel/cli-config`: elimina los cuatro avisos altos de la instalación inicial. Auditoría final de producción: cero altos/críticos y ocho avisos moderados transitivos en la cadena de ExcelJS/archiver/minimatch. La instalación completa informa 23 avisos moderados incluyendo desarrollo. No se aplicaron downgrades automáticos.
- Se preservan los cambios locales funcionales de clientes, simulador, compromisos, PDFs, productos con costo variable, edición de contacto y verificación presencial de correo.

## Validación previa al push

- Lint y TypeScript correctos.
- 108 archivos de pruebas y 474 casos correctos, incluidas pruebas con base aislada.
- Build de producción webpack correcto con Next.js 16.4.3.
- Chromium: nueve rutas de acceso/públicas a 1440 y 390 px, todas HTTP 200, sin desbordes horizontales ni errores JavaScript. APIs administrativas de simulador y compromisos rechazan solicitudes anónimas con 401. El PDF de cliente se valida con pruebas de autorización; el servidor local sin base real devuelve 503 al inicializar autenticación y no sirve para comprobar la sesión de producción.
- Sin coincidencias de los patrones de credenciales revisados en el contenido preparado para commit. Variables privadas, documentación operativa local y herramientas temporales se excluyen del commit.

## Base de producción

Se inspeccionó el esquema `oc_customers`: las migraciones 010–013 ya estaban presentes. Se aplicó únicamente 014, que permite NULL en el costo protegido de ventas por categoría. El script confirmó `salesAndPaymentsUnchanged: true` comparando huellas de usuarios, ventas, cuotas, pagos y saldos. No se crearon ventas ni clientes y no se enviaron correos de prueba.

La confirmación del nuevo despliegue y las comprobaciones del dominio se realizan después del push; este archivo registra la preparación y no acredita por sí mismo la publicación.
