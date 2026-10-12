import "server-only";
import mysql from "mysql2/promise";
import type { NewPurchaseOrder, OrderStatus, PurchaseOrder } from "./types";

let pool: mysql.Pool | null = null;
let ready: Promise<void> | null = null;
function getPool() {
  pool ??= mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD ?? "", database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 5, charset: "utf8mb4", timezone: "Z" });
  return pool;
}
function ensureTable() {
  ready ??= getPool().query(`CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    items LONGTEXT NOT NULL,
    cliente LONGTEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'nuevo',
    creado_en DATETIME(3) NOT NULL,
    KEY idx_pedidos_creado (creado_en)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).then(() => undefined).catch((error) => { ready = null; throw error; });
  return ready;
}
type OrderRow = { id: string; items: string; cliente: string; estado: OrderStatus; creado_en: Date | string };
function mapRow(row: OrderRow): PurchaseOrder {
  const created = row.creado_en instanceof Date ? row.creado_en.toISOString() : new Date(row.creado_en.includes("T") ? row.creado_en : `${row.creado_en.replace(" ", "T")}Z`).toISOString();
  return { id: row.id, items: JSON.parse(row.items) as PurchaseOrder["items"], customer: JSON.parse(row.cliente) as PurchaseOrder["customer"], status: row.estado, createdAt: created };
}
export const orderMysqlStore = {
  async list() {
    await ensureTable();
    const [rows] = await getPool().query<mysql.RowDataPacket[]>("SELECT * FROM pedidos ORDER BY creado_en DESC LIMIT 500");
    return (rows as OrderRow[]).map(mapRow);
  },
  async create(order: NewPurchaseOrder) {
    await ensureTable();
    const saved: PurchaseOrder = { ...order, status: "nuevo" };
    await getPool().query("INSERT INTO pedidos (id, items, cliente, estado, creado_en) VALUES (?, ?, ?, ?, ?)", [saved.id, JSON.stringify(saved.items), JSON.stringify(saved.customer), saved.status, new Date(saved.createdAt)]);
    return saved;
  },
  async updateStatus(id: string, status: OrderStatus) {
    await ensureTable();
    const [result] = await getPool().query<mysql.ResultSetHeader>("UPDATE pedidos SET estado = ? WHERE id = ?", [status, id]);
    return result.affectedRows > 0;
  },
};
