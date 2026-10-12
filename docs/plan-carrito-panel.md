# Plan de carrito, ventas y panel administrativo

## Alcance

Implementación solicitada para Óptica & Cristal: panel que reúna formularios, consultas y pedidos; acceso de administración seguro; carrito y registro de solicitudes de compra.

## Etapas

1. **Base segura:** mantener autenticación en servidor y cookie firmada HTTP-only/SameSite, revisar validación y límites de acceso, y documentar variables de producción. Ningún secreto va al cliente.
2. **Carrito reutilizable:** agregar/quitar productos, actualizar cantidades, conservar el carrito localmente y mostrar un flujo claro móvil/escritorio.
3. **Pedido y registro de venta:** validar en servidor cliente, consentimiento y productos/cantidades; guardar pedido y sus datos de contacto; permitir seguimiento en la bandeja interna.
4. **Panel:** reunir solicitudes de jornada/convenio y pedidos, filtrar/buscar y actualizar estado con autorización del servidor.
5. **Calidad:** pruebas unitarias/API/componentes, ESLint, TypeScript y compilación.

## Estado de ejecución

- **Implementado:** el login existente protege el panel con sesión HMAC firmada, cookie HTTP-only/SameSite y rate limit; se agregó límite de tamaño y soporte para una segunda cuenta administrativa opcional.
- **Implementado:** el footer de las cuatro vistas enlaza a `/admin/login` con la opción “Ingreso ejecutivos”.
- **Cuenta adicional:** `ADMIN_USER_2` y `ADMIN_PASSWORD_2` están configurados solo en `.env.local` local; en el hosting deberán cargarse como variables privadas antes de desplegar.
- **Implementado:** el carro guarda productos y cantidades en el navegador; sus solicitudes se validan y registran con datos de contacto.
- **Implementado:** los pedidos se almacenan en MySQL cuando está configurado o en archivo local como respaldo; el panel `/admin/pedidos` permite buscar y cambiar estado. La tabla MySQL de pedidos se crea de forma idempotente al usar el panel/API.
- **Pendiente de negocio:** conectar el almacenamiento MySQL del hosting, configurar y probar notificaciones de pedido, aprobar precios/stock/despacho/pago y desarrollar checkout con pago real. No habilitar cobros hasta definir esos datos.
- **Validación:** ESLint, TypeScript, 49 pruebas unitarias y compilación de producción aprobadas. El enlace del footer y el carrito ya pasaron en escritorio y móvil; la galería pasó tres repeticiones dirigidas tras ajustar su scroll.
- **Base de datos:** la app crea la tabla automáticamente si el usuario MySQL permite DDL. También está disponible [sql/pedidos.sql](../sql/pedidos.sql) para importarla manualmente en phpMyAdmin.

## Límite comercial actual

El catálogo tiene imágenes de referencia sin precios ni stock. Por eso el carrito crea una **solicitud de compra para cotización y confirmación**, no una venta cobrada. Para activar checkout/pago real se requieren lista de precios, inventario, costo y cobertura de despacho, política de cambios/garantía y proveedor de pago. No se confirmará disponibilidad automáticamente.

## Operación y despliegue

Las solicitudes y pedidos necesitan almacenamiento duradero para producción; la app ya admite MySQL o archivo local. Configurar MySQL en producción y credenciales administrativas fuertes mediante el panel de variables del hosting. Probar correo de confirmación/aviso en el entorno real antes de publicar el flujo.
