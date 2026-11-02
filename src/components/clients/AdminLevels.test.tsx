import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { LevelSettings } from "@/lib/clients/level-types";
import { AdminLevels } from "./AdminLevels";
const initial: LevelSettings = { levels: [{ code: "start", name: "Start", revision: 1, maxAmount: 40000, maxPercent: 30, maxInstallments: 1 }, { code: "vip", name: "VIP", revision: 1, maxAmount: 60000, maxPercent: 40, maxInstallments: 2 }], history: [], nextCursor: null };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => vi.unstubAllGlobals());
function edit() {
  fireEvent.click(screen.getByRole("button", { name: "Editar beneficios de Start" }));
  fireEvent.change(screen.getByLabelText("Cupo máximo (CLP)"), { target: { value: "50000" } });
  fireEvent.change(screen.getByLabelText("Motivo del cambio"), { target: { value: "Nuevo cupo aprobado" } });
}
it("shows current benefits and history without edit controls for read-only staff", () => {
  render(<AdminLevels initial={initial} canEdit={false} />);
  expect(screen.getByRole("heading", { name: "Start" })).toBeVisible();
  expect(screen.getByText("$40.000")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Editar beneficios/ })).not.toBeInTheDocument();
  expect(screen.getByText("Todavía no hay modificaciones registradas.")).toBeVisible();
});
it("requires a reason and sends the level version with its changes", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(reply({ replayed: false })).mockResolvedValueOnce(reply({ settings: { ...initial, levels: [{ ...initial.levels[0], maxAmount: 50000, revision: 2 }, initial.levels[1]] } }));
  vi.stubGlobal("fetch", fetcher);
  render(<AdminLevels initial={initial} canEdit />);
  fireEvent.click(screen.getByRole("button", { name: "Editar beneficios de Start" }));
  expect(screen.getByRole("button", { name: "Guardar beneficios" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Cupo máximo (CLP)"), { target: { value: "50000" } });
  expect(screen.getByRole("button", { name: "Guardar beneficios" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Motivo del cambio"), { target: { value: "Nuevo cupo aprobado" } });
  fireEvent.submit(screen.getByRole("form", { name: "Editar beneficios de Start" }));
  await screen.findByText(/Beneficios actualizados/);
  await screen.findByText("$50.000");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ code: "start", expectedRevision: 1, maxAmount: 50000, reason: "Nuevo cupo aprobado", requestKey: expect.any(String) });
});
it("keeps the same request key when retrying an uncertain write", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(reply({ replayed: true })).mockResolvedValueOnce(reply({ settings: initial }));
  vi.stubGlobal("fetch", fetcher); render(<AdminLevels initial={initial} canEdit />); edit();
  fireEvent.submit(screen.getByRole("form", { name: "Editar beneficios de Start" }));
  await screen.findByRole("alert");
  fireEvent.submit(screen.getByRole("form", { name: "Editar beneficios de Start" }));
  await screen.findByText("El cambio ya estaba registrado.");
  expect(JSON.parse(fetcher.mock.calls[0][1].body).requestKey).toBe(JSON.parse(fetcher.mock.calls[1][1].body).requestKey);
});
it("reloads current values after a conflicting edit and requires reviewing them again", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(reply({ error: "Conflicto" }, 409)).mockResolvedValueOnce(reply({ settings: { ...initial, levels: [{ ...initial.levels[0], revision: 2, maxAmount: 45000 }] } }));
  vi.stubGlobal("fetch", fetcher); render(<AdminLevels initial={initial} canEdit />); edit();
  fireEvent.submit(screen.getByRole("form", { name: "Editar beneficios de Start" }));
  await screen.findByText(/Este nivel cambió mientras editabas/);
  await screen.findByText("$45.000");
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
it("shows before/after, actor, date and reason, with history pagination", async () => {
  const change = { id: "change", code: "start", name: "Start", revision: 2, actor: "responsable", reason: "Nuevo cupo aprobado", before: initial.levels[0], after: { ...initial.levels[0], maxAmount: 50000 }, createdAt: "2026-11-02T15:00:00Z" };
  const fetcher = vi.fn().mockResolvedValue(reply({ settings: { ...initial, history: [change], nextCursor: null } }));
  vi.stubGlobal("fetch", fetcher); render(<AdminLevels initial={{ ...initial, history: [change], nextCursor: "cursor" }} canEdit />);
  const history = screen.getByRole("region", { name: "Historial de modificaciones" });
  for (const text of ["Antes", "Después", "responsable", "Nuevo cupo aprobado"]) expect(within(history).getByText(text)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Ver modificaciones anteriores" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/admin/clientes/niveles?cursor=cursor", expect.objectContaining({ cache: "no-store" })));
});
