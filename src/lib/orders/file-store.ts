import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NewPurchaseOrder, OrderStatus, PurchaseOrder } from "./types";

const pathToOrders = path.join(process.cwd(), "data", "pedidos.json");
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>) {
  const next = queue.then(task, task);
  queue = next.then(() => undefined, () => undefined);
  return next;
}
async function readAll(): Promise<PurchaseOrder[]> {
  try {
    const value: unknown = JSON.parse(await readFile(pathToOrders, "utf8"));
    return Array.isArray(value) ? value as PurchaseOrder[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
async function writeAll(rows: PurchaseOrder[]) {
  await mkdir(path.dirname(pathToOrders), { recursive: true });
  const temp = `${pathToOrders}.tmp`;
  await writeFile(temp, JSON.stringify(rows, null, 2), "utf8");
  try { await rename(temp, pathToOrders); }
  catch { await rm(pathToOrders, { force: true }); await rename(temp, pathToOrders); }
}

export const orderFileStore = {
  async list() { return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async create(order: NewPurchaseOrder) {
    return enqueue(async () => {
      const rows = await readAll();
      const saved: PurchaseOrder = { ...order, status: "nuevo" };
      rows.push(saved);
      await writeAll(rows);
      return saved;
    });
  },
  async updateStatus(id: string, status: OrderStatus) {
    return enqueue(async () => {
      const rows = await readAll();
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return false;
      rows[index] = { ...rows[index], status };
      await writeAll(rows);
      return true;
    });
  },
};
