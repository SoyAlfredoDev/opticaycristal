import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CustomerProfile } from "@/lib/clients/types";
const navigation = vi.hoisted(() => ({ path: "/mi-cuenta/cuotas", router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.path, useRouter: () => navigation.router, useSearchParams: () => new URLSearchParams() }));
import { CustomerDataProvider, useCustomerData, CUSTOMER_REFRESH_MS } from "./CustomerDataProvider";
import { CustomerSyncStatus } from "./CustomerDataState";
import Inicio from "@/app/mi-cuenta/(privado)/page";
import Cuotas from "@/app/mi-cuenta/(privado)/cuotas/page";
import Compras from "@/app/mi-cuenta/(privado)/compras/page";
import Perfil from "@/app/mi-cuenta/(privado)/perfil/page";
const customer: CustomerProfile = {
  id: "one", firstName: "Cliente", lastName: "Prueba", email: "test@example.invalid", emailVerified: true,
  whatsapp: "+56900000000", whatsappVerified: false, rut: "123456785", identityVerified: false, createdAt: "2026-01-01T00:00:00.000Z",
  tier: { code: "start", name: "Start", maxAmount: 40000, maxPercent: 30, maxInstallments: 1 },
  credit: { capacity: 40000, available: 40000, enabled: true, principalOutstanding: 0, needsIdentity: false }, purchases: [],
};
const response = (c = customer, etag = '"v1"') => new Response(JSON.stringify({ customer: c, tiers: [c.tier] }), { headers: { ETag: etag } });
function Probe() { const data = useCustomerData(); return <><output aria-label="Cupo">{data.customer?.credit.capacity ?? "pendiente"}</output><button onClick={() => void data.refresh()}>Consultar actualización</button><button onClick={data.clear}>Salir</button></>; }
function Portal({ view = "cuotas", owner = "one" }: { view?: string; owner?: string }) {
  return <CustomerDataProvider key={owner} ownerId={owner} viewer={{ firstName: "Cliente", lastName: "Prueba" }}><CustomerSyncStatus />{view === "inicio" ? <Inicio /> : view === "cuotas" ? <Cuotas /> : view === "perfil" ? <Perfil /> : <Compras />}<Probe /></CustomerDataProvider>;
}
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => { navigation.path = "/mi-cuenta/cuotas"; vi.stubGlobal("BroadcastChannel", undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("muestra la pantalla antes de recibir los datos, sin inventar cero cuotas ni saldo", async () => {
  let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
  render(<Portal />);
  expect(screen.getByRole("heading", { name: "Mis cuotas" })).toBeVisible();
  expect(screen.getByLabelText("Cargando tus datos")).toBeVisible();
  expect(screen.queryByText("Estás al día")).not.toBeInTheDocument();
  await act(async () => finish(response()));
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("40000");
});
it("reutiliza la misma consulta al pasar de Cuotas a Compras y Perfil", async () => {
  const fetcher = vi.fn().mockResolvedValue(response()); vi.stubGlobal("fetch", fetcher);
  const page = render(<Portal />); await flush();
  navigation.path = "/mi-cuenta/compras"; page.rerender(<Portal view="compras" />);
  expect(screen.getByRole("heading", { name: "Mis compras" })).toBeVisible();
  navigation.path = "/mi-cuenta/perfil"; page.rerender(<Portal view="perfil" />);
  expect(screen.getAllByText("test@example.invalid")[0]).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("deduplica consultas simultáneas y conserva los montos si la versión no cambió", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(new Response(null, { status: 304 })); vi.stubGlobal("fetch", fetcher);
  render(<Portal />); await flush();
  await act(async () => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online")); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][1].headers).toEqual({ "If-None-Match": '"v1"' });
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("40000");
});
it("actualiza los montos sin bloquear la pantalla al regresar a la ventana", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(response({ ...customer, credit: { ...customer.credit, capacity: 30000, principalOutstanding: 10000 } }, '"v2"')));
  render(<Portal />); await flush();
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(screen.getByRole("heading", { name: "Mis cuotas" })).toBeVisible();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("30000");
});
it("refresca cada 45 segundos mientras está visible y al navegar tras 15 segundos", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response())); vi.stubGlobal("fetch", fetcher);
  const page = render(<Portal />); await flush();
  await act(async () => { vi.advanceTimersByTime(16_000); });
  navigation.path = "/mi-cuenta/compras"; page.rerender(<Portal view="compras" />); await flush();
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => { vi.advanceTimersByTime(CUSTOMER_REFRESH_MS - 16_000); });
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("conserva la última información y permite reintentar si cae la conexión", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(response()); vi.stubGlobal("fetch", fetcher);
  render(<Portal />); await flush();
  await act(async () => window.dispatchEvent(new Event("online")));
  expect(screen.getByText(/Mostrando la última información/)).toBeVisible();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("40000");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" })); await flush();
  expect(screen.queryByText(/Mostrando la última información/)).not.toBeInTheDocument();
});
it("vacía datos y redirige al expirar la sesión; nunca muestra otra cuenta", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(new Response(null, { status: 401 })); vi.stubGlobal("fetch", fetcher);
  const page = render(<Portal />); await flush();
  fireEvent.click(screen.getByRole("button", { name: "Consultar actualización" })); await flush();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("pendiente");
  expect(navigation.router.replace).toHaveBeenCalledWith("/mi-cuenta/ingresar");
  fetcher.mockResolvedValue(response({ ...customer, id: "intruder", firstName: "Otra persona" }));
  page.rerender(<Portal owner="two" />); await flush();
  expect(screen.queryByText("Otra persona")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("pendiente");
});
it("aborta una consulta pendiente al cerrar sesión y no restaura sus datos después", async () => {
  let finish!: (value: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetcher);
  render(<Portal />);
  fireEvent.click(screen.getByRole("button", { name: "Salir" }));
  expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(true);
  await act(async () => finish(response()));
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("pendiente");
});
it("no consulta periódicamente mientras la pestaña está oculta", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response())); vi.stubGlobal("fetch", fetcher);
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  render(<Portal />); await flush();
  await act(async () => { vi.advanceTimersByTime(CUSTOMER_REFRESH_MS * 3); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(fetcher).toHaveBeenCalledTimes(2); visibility.mockRestore();
});
it("el cierre de sesión en otra pestaña borra los datos de esta", async () => {
  let receive!: (event: { data: string }) => void;
  const close = vi.fn();
  class Channel {
    set onmessage(fn: typeof receive) { receive = fn; }
    close = close;
  }
  vi.stubGlobal("BroadcastChannel", Channel); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
  const page = render(<Portal />); await flush();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("40000");
  act(() => receive({ data: "signed-out" }));
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("pendiente");
  expect(navigation.router.replace).toHaveBeenCalledWith("/mi-cuenta/ingresar");
  page.unmount(); expect(close).toHaveBeenCalled();
});

it("actualiza cupo y categoría de Inicio con la nueva información del servidor", async () => {
  navigation.path = "/mi-cuenta";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(response({ ...customer,
    tier: { ...customer.tier, code: "vip", name: "VIP", maxAmount: 80000, maxPercent: 40, maxInstallments: 2 },
    credit: { ...customer.credit, capacity: 80000, available: 80000 } }, '\"v2\"')));
  render(<Portal view="inicio" />); await flush();
  expect(screen.getByRole("heading", { name: "Hola, Cliente" })).toBeVisible();
  expect(screen.getByRole("button", { name: /tu categoría es Start/ })).toBeVisible();
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(screen.getByRole("button", { name: /tu categoría es VIP/ })).toBeVisible();
  expect(screen.getByLabelText("Cupo")).toHaveTextContent("80000");
  expect(screen.getByText(/Hasta el 40% de tu compra · 2 cuotas/)).toBeVisible();
});
