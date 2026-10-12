import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { store, storeMapUrl, storePhotos } from "./content";
import { VisitSection } from "./VisitSection";

describe("local de Óptica & Cristal", () => {
  it("usa la dirección oficial y enlaces de Google Maps", () => {
    expect(store.fullAddress).toBe("Huérfanos 713, local 18, Santiago Centro");
    expect(storePhotos).toEqual([]);
    expect(decodeURIComponent(storeMapUrl("embed"))).toContain("Huérfanos 713, Santiago Centro, Santiago, Chile");
    expect(storeMapUrl("embed")).toContain("output=embed");
    expect(storeMapUrl("directions")).toContain("https://www.google.com/maps/dir/?api=1&destination=");
    expect(storeMapUrl("search")).toContain("https://www.google.com/maps/search/?api=1&query=");
  });

  it("muestra dirección y mapa, sin el bloque de fotos", () => {
    render(<VisitSection />);
    expect(screen.getByRole("heading", { name: "Huérfanos 713" })).toBeVisible();
    expect(screen.getByText("Local 18, Santiago Centro")).toBeVisible();
    expect(screen.getByTitle("Mapa de Óptica & Cristal, Huérfanos 713, local 18, Santiago Centro")).toHaveAttribute("src", storeMapUrl("embed"));
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", storeMapUrl("directions"));
    expect(screen.getByRole("link", { name: "Abrir en Google Maps" })).toHaveAttribute("href", storeMapUrl("search"));
    expect(screen.queryByText("Fotos del local")).not.toBeInTheDocument();
    expect(screen.queryByText("Pronto publicaremos fotos del local.")).not.toBeInTheDocument();
  });
});
