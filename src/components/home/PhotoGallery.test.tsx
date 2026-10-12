import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoGallery } from "./PhotoGallery";
import { GALLERY_SET_HEIGHT, GALLERY_SET_WIDTH, galleryPhotos } from "./photo-gallery";

describe("PhotoGallery", () => {
  it("muestra fotos de la óptica y de clientes en lugares distintos", () => {
    render(<PhotoGallery />);
    expect(screen.getByRole("heading", { name: "Vistas de la óptica" })).toBeVisible();
    expect(screen.getByText(/Huérfanos 713, Santiago Centro/)).toBeVisible();
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("alt"))).toEqual(
      galleryPhotos.map((photo) => photo.alt),
    );
    expect(document.querySelectorAll("img")).toHaveLength(galleryPhotos.length * 2);
    expect(document.querySelector("[aria-hidden='true'] img")).toHaveAttribute("alt", "");
    const tops = new Set(galleryPhotos.map((photo) => photo.y));
    const sizes = new Set(galleryPhotos.map((photo) => `${photo.w}x${photo.h}`));
    expect(tops.size).toBeGreaterThan(3);
    expect(sizes.size).toBe(galleryPhotos.length);
    expect(galleryPhotos.every((photo) => (
      photo.x >= 0
      && photo.y >= 24
      && photo.x + photo.w <= GALLERY_SET_WIDTH - 80
      && photo.y + photo.h <= GALLERY_SET_HEIGHT - 24
    ))).toBe(true);
  });

  it("pausa el desplazamiento de derecha a izquierda", () => {
    render(<PhotoGallery />);
    const track = document.querySelector("[data-paused]");
    expect(track).toHaveAttribute("data-paused", "false");
    fireEvent.click(screen.getByRole("button", { name: "Pausar galería" }));
    expect(track).toHaveAttribute("data-paused", "true");
    expect(screen.getByRole("button", { name: "Reanudar galería" })).toHaveAttribute("aria-pressed", "true");
  });
});
