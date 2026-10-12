import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JornadaCta } from "./JornadaCta";

const { open } = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@/components/forms/JornadaModalProvider", () => ({ useJornadaModal: () => ({ open }) }));
afterEach(() => window.history.replaceState(null, "", "/"));

describe("JornadaCta", () => {
  it("abre el formulario existente", () => {
    render(<JornadaCta />);
    fireEvent.click(screen.getByRole("button", { name: "Coordinar una jornada" }));
    expect(open).toHaveBeenCalledOnce();
  });
  it("conserva el enlace profundo histórico de jornadas", () => {
    window.history.replaceState(null, "", "/#contratar");
    render(<JornadaCta />);
    expect(open).toHaveBeenCalledOnce();
  });
});
