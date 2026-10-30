import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerPromotions } from "./CustomerPromotions";
function motion(reduce = false) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduce, media: "", addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("Anuncios del cliente", () => {
  it("empieza con la consulta gratuita y rota al anuncio de visita", () => {
    motion(); vi.useFakeTimers(); render(<CustomerPromotions />);
    expect(screen.getByRole("heading", { name: /Consulta visual.*Totalmente gratuita/ })).toBeVisible();
    expect(new URL(screen.getByRole("link", { name: "Coordinar mi consulta" }).getAttribute("href")!).searchParams.get("text")).toContain("consulta visual gratuita");
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText("Imagen referencial")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", expect.stringContaining("maps/dir/"));
  });
  it("permite pausar y seleccionar un anuncio sin que cambie solo", () => {
    motion(); vi.useFakeTimers(); render(<CustomerPromotions />);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    act(() => { vi.advanceTimersByTime(16000); });
    expect(screen.getByRole("heading", { name: /Consulta visual/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar anuncio 2: Visita la óptica" }));
    act(() => { vi.advanceTimersByTime(16000); });
    expect(screen.getByText("Imagen referencial")).toBeVisible();
  });
  it("no rota automáticamente con movimiento reducido", () => {
    motion(true); vi.useFakeTimers(); render(<CustomerPromotions />);
    act(() => { vi.advanceTimersByTime(24000); });
    expect(screen.getByRole("heading", { name: /Consulta visual/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar anuncio 2: Visita la óptica" }));
    expect(screen.getByText("Imagen referencial")).toBeVisible();
  });
  it("detiene la rotación mientras el teclado está dentro del carrusel", () => {
    motion(); vi.useFakeTimers(); render(<CustomerPromotions />);
    fireEvent.focus(screen.getByRole("link", { name: "Coordinar mi consulta" }));
    act(() => { vi.advanceTimersByTime(16000); });
    expect(screen.getByRole("heading", { name: /Consulta visual/ })).toBeVisible();
  });
});
