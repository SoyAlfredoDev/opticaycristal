-- Registro de solicitudes del sitio Óptica y Cristal.
-- Importar en phpMyAdmin sobre la base MySQL de cPanel.
-- La aplicación también crea esta tabla al conectar si el usuario tiene permiso.

CREATE TABLE IF NOT EXISTS solicitudes (
  id VARCHAR(36) NOT NULL,
  origen VARCHAR(64) NOT NULL,
  responsable VARCHAR(160) NOT NULL,
  cargo VARCHAR(160) NOT NULL,
  telefono VARCHAR(40) NOT NULL,
  correo VARCHAR(190) NOT NULL,
  empresa VARCHAR(190) NOT NULL,
  region VARCHAR(120) NOT NULL,
  mes_estimado VARCHAR(16) NOT NULL,
  autorizacion_datos TINYINT(1) NOT NULL,
  correo_destino VARCHAR(190) NOT NULL,
  correo_estado VARCHAR(20) NOT NULL,
  correo_detalle VARCHAR(500) NULL,
  correo_cliente_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  correo_cliente_detalle VARCHAR(500) NULL,
  creado_en DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_solicitudes_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
