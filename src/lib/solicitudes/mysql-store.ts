import "server-only";

import mysql from "mysql2/promise";
import type { ActualizacionCorreo, CorreoEstado, NuevaSolicitud, Solicitud } from "@/lib/solicitudes/types";

const CREATE_TABLE = `
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
  detalles LONGTEXT NULL,
  autorizacion_datos TINYINT(1) NOT NULL,
  correo_destino VARCHAR(190) NOT NULL,
  correo_estado VARCHAR(20) NOT NULL,
  correo_detalle VARCHAR(500) NULL,
  correo_cliente_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  correo_cliente_detalle VARCHAR(500) NULL,
  correo_id VARCHAR(100) NULL,
  correo_cliente_id VARCHAR(100) NULL,
  creado_en DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_solicitudes_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

type SolicitudRow = {
  id: string;
  origen: Solicitud["origen"];
  responsable: string;
  cargo: string;
  telefono: string;
  correo: string;
  empresa: string;
  region: string;
  mes_estimado: string;
  detalles: string | null;
  autorizacion_datos: number;
  correo_destino: string;
  correo_estado: CorreoEstado;
  correo_detalle: string | null;
  correo_cliente_estado: CorreoEstado | null;
  correo_cliente_detalle: string | null;
  correo_id?: string | null;
  correo_cliente_id?: string | null;
  creado_en: Date | string;
};

let pool: mysql.Pool | null = null;
let ready: Promise<void> | null = null;

function getPool() {
  pool ??= mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: false,
  });
  return pool;
}

async function ensureTable() {
  ready ??= (async () => {
    const pool = getPool();
    await pool.query(CREATE_TABLE);
    const alters = [
      "ALTER TABLE solicitudes ADD COLUMN detalles LONGTEXT NULL",
      "ALTER TABLE solicitudes ADD COLUMN correo_cliente_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'",
      "ALTER TABLE solicitudes ADD COLUMN correo_cliente_detalle VARCHAR(500) NULL",
      "ALTER TABLE solicitudes ADD COLUMN correo_id VARCHAR(100) NULL",
      "ALTER TABLE solicitudes ADD COLUMN correo_cliente_id VARCHAR(100) NULL",
    ];
    for (const statement of alters) {
      try {
        await pool.query(statement);
      } catch (error) {
        if ((error as { code?: string }).code !== "ER_DUP_FIELDNAME") throw error;
      }
    }
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

function toMysqlDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 23).replace("T", " ");
}

function fromMysqlDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return date.toISOString();
}

function mapRow(row: SolicitudRow): Solicitud {
  return {
    id: row.id,
    origen: row.origen,
    responsable: row.responsable,
    cargo: row.cargo,
    telefono: row.telefono,
    correo: row.correo,
    empresa: row.empresa,
    region: row.region,
    mesEstimado: row.mes_estimado,
    detalles: row.detalles ? JSON.parse(row.detalles) as Solicitud["detalles"] : undefined,
    autorizacionDatos: Boolean(row.autorizacion_datos),
    correoDestino: row.correo_destino,
    correoEstado: row.correo_estado,
    correoDetalle: row.correo_detalle,
    correoClienteEstado: row.correo_cliente_estado ?? "pendiente",
    correoClienteDetalle: row.correo_cliente_detalle,
    correoId: row.correo_id ?? null,
    correoClienteId: row.correo_cliente_id ?? null,
    creadoEn: fromMysqlDate(row.creado_en),
  };
}

export const mysqlStore = {
  async list() {
    await ensureTable();
    const [rows] = await getPool().query<mysql.RowDataPacket[]>(
      "SELECT * FROM solicitudes ORDER BY creado_en DESC LIMIT 500"
    );
    return (rows as SolicitudRow[]).map(mapRow);
  },

  async get(id: string) {
    await ensureTable();
    const [rows] = await getPool().query<mysql.RowDataPacket[]>(
      "SELECT * FROM solicitudes WHERE id = ? LIMIT 1",
      [id]
    );
    const row = (rows as SolicitudRow[])[0];
    return row ? mapRow(row) : null;
  },

  async create(input: NuevaSolicitud) {
    await ensureTable();
    const solicitud: Solicitud = {
      ...input,
      correoEstado: input.correoEstado ?? "pendiente",
      correoDetalle: input.correoDetalle ?? null,
      correoClienteEstado: input.correoClienteEstado ?? "pendiente",
      correoClienteDetalle: input.correoClienteDetalle ?? null,
    };
    await getPool().query(
      `INSERT INTO solicitudes (
        id, origen, responsable, cargo, telefono, correo, empresa, region, mes_estimado,
        autorizacion_datos, correo_destino, correo_estado, correo_detalle,
        correo_cliente_estado, correo_cliente_detalle, creado_en, detalles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        solicitud.id,
        solicitud.origen,
        solicitud.responsable,
        solicitud.cargo,
        solicitud.telefono,
        solicitud.correo,
        solicitud.empresa,
        solicitud.region,
        solicitud.mesEstimado,
        solicitud.autorizacionDatos ? 1 : 0,
        solicitud.correoDestino,
        solicitud.correoEstado,
        solicitud.correoDetalle,
        solicitud.correoClienteEstado,
        solicitud.correoClienteDetalle,
        toMysqlDate(solicitud.creadoEn),
        solicitud.detalles ? JSON.stringify(solicitud.detalles) : null,
      ]
    );
    return solicitud;
  },

  async updateCorreo(id: string, actualizacion: ActualizacionCorreo) {
    await ensureTable();
    await getPool().query(
      `UPDATE solicitudes
       SET correo_estado = ?, correo_detalle = ?, correo_cliente_estado = ?, correo_cliente_detalle = ?, correo_id = COALESCE(?, correo_id), correo_cliente_id = COALESCE(?, correo_cliente_id)
       WHERE id = ?`,
      [
        actualizacion.correoEstado,
        actualizacion.correoDetalle,
        actualizacion.correoClienteEstado,
        actualizacion.correoClienteDetalle,
        actualizacion.correoId ?? null,
        actualizacion.correoClienteId ?? null,
        id,
      ]
    );
  },
};
