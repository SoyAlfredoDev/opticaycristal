-- Solicitudes de compra del catálogo Óptica & Cristal.
-- Importar en phpMyAdmin sobre la base MySQL de cPanel si el usuario
-- de conexión de la aplicación no tiene permisos CREATE TABLE.

CREATE TABLE IF NOT EXISTS pedidos (
  id VARCHAR(36) NOT NULL,
  items LONGTEXT NOT NULL,
  cliente LONGTEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  creado_en DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pedidos_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
