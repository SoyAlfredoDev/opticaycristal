import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHeader } from "./HomeHeader";

describe("HomeHeader", () => {
  it("abre y cierra el menú con Escape y devuelve el foco", () => {
    render(<HomeHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveFocus();
    expect(screen.queryByRole("navigation", { name: "Navegación móvil" })).not.toBeInTheDocument();
  });
  it("cierra el menú al elegir una sección", () => {
    render(<HomeHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const nav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const link = within(nav).getByRole("link", { name: "Óptica" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });
  it("cierra el menú al pulsar fuera del encabezado", () => {
    render(<><HomeHeader /><main>Contenido</main></>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.pointerDown(screen.getByRole("main"));
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });
});
