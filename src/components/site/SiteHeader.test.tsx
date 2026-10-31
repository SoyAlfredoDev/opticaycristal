import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("Acceso único de clientes en la cabecera", () => {
  it("conserva el botón Mi cuenta sin repetirlo en los menús de escritorio y móvil", () => {
    render(<SiteHeader active="Óptica" />);
    expect(screen.getByRole("link", { name: "Mi cuenta" })).toHaveAttribute("href", "/mi-cuenta");
    expect(within(screen.getByRole("navigation", { name: "Navegación principal" })).queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(within(screen.getByRole("navigation", { name: "Navegación móvil" })).queryByRole("link", { name: "Mi cuenta" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Mi cuenta" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
  });
});
