# Alta de clientes desde administración

Administradores y vendedores pueden abrir **Crear cliente** desde **Clientes** o desde el primer paso de **Registrar venta**. Se registran el RUT, nombre, apellido, correo y WhatsApp con autorización del cliente. Si el RUT existe, se conserva su ficha sin actualizar sus datos ni volver a enviar un correo automáticamente.

La ficha nueva queda en Start y los contactos quedan pendientes. Al guardar se solicita el envío del correo corporativo para que el cliente defina su contraseña. El enlace vence en 30 minutos y solo se puede usar una vez. Si el proveedor no confirma el envío, la ficha sigue guardada y se puede volver a intentar desde el resultado del alta, con un límite de un intento por minuto y tres por hora por cliente. Un cliente con contraseña recupera el acceso por el flujo habitual.

El personal puede iniciar la verificación de correo o WhatsApp desde la ficha, sin que sea un requisito del alta ni de la invitación. La verificación de correo sigue siendo requisito para utilizar crédito. La verificación de WhatsApp depende de la disponibilidad del proveedor.

El alta usa las tablas y migraciones existentes. Las pruebas de integración usan una base PostgreSQL aislada y un transporte de correo de prueba; los recorridos de interfaz comprueban ambos puntos de entrada.
