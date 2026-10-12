import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionGallery } from "./CollectionGallery";

describe("CollectionGallery", () => {
  it("amplía la imagen seleccionada y permite consultar la categoría", () => {
    render(<CollectionGallery />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de lentes de sol" }));
    const dialog = screen.getByRole("dialog", { name: "Lentes de sol" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/images/home/oc-lentes-sol-v01.png");
    expect(within(dialog).getByRole("button", { name: "Cerrar galería" })).toHaveFocus();
    const link = within(dialog).getByRole("link", { name: "Consultar por WhatsApp" });
    expect(new URL(link.getAttribute("href")!).searchParams.get("text")).toContain("lentes de sol");
  });
  it("navega circularmente con los controles y con el teclado", () => {
    render(<CollectionGallery />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de lentes ópticos" }));
    fireEvent.click(screen.getByRole("button", { name: "Imagen anterior" }));
    expect(screen.getByRole("dialog", { name: "Accesorios" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Lentes ópticos" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(screen.getByRole("dialog", { name: "Lentes de sol" })).toBeVisible();
  });
  it("restaura el scroll al cerrar", () => {
    render(<CollectionGallery />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de accesorios" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar galería" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
  it("cierra al pulsar el fondo del diálogo", () => {
    render(<CollectionGallery />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de accesorios" }));
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("mantiene el foco dentro de la galería en ambos sentidos", () => {
    render(<CollectionGallery />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen de accesorios" }));
    const dialog = screen.getByRole("dialog");
    const first = within(dialog).getByRole("button", { name: "Cerrar galería" });
    const last = within(dialog).getByRole("link", { name: "Consultar por WhatsApp" });
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(first).toHaveFocus();
  });
});
