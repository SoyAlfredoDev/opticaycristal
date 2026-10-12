import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/orders/types";
import { updateOrderStatus } from "@/lib/orders/store";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : undefined;
  if (typeof status !== "string" || !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  try {
    const updated = await updateOrderStatus(id, status as (typeof ORDER_STATUSES)[number]);
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No encontramos el pedido." }, { status: 404 });
  } catch (error) { console.error("No se pudo actualizar el pedido", error); return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 503 }); }
}
