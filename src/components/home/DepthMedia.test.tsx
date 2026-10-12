import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DepthMedia } from "./DepthMedia";

afterEach(() => vi.restoreAllMocks());

describe("DepthMedia", () => {
  it("aplica una perspectiva limitada con ratón y la restablece al salir", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 100 } as DOMRect);
    const { container } = render(<DepthMedia><p>Producto</p></DepthMedia>);
    const element = container.firstElementChild as HTMLElement;
    const move = new Event("pointermove", { bubbles: true });
    Object.assign(move, { pointerType: "mouse", clientX: 200, clientY: 0 });
    fireEvent(element, move);
    expect(element.style.getPropertyValue("--tilt-y")).toBe("2.5deg");
    fireEvent.pointerLeave(element);
    expect(element.style.getPropertyValue("--tilt-y")).toBe("");
  });
  it("mantiene estable el producto con movimiento reducido", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    render(<DepthMedia><p>Producto</p></DepthMedia>);
    const element = screen.getByText("Producto").parentElement!;
    const move = new Event("pointermove", { bubbles: true });
    Object.assign(move, { pointerType: "mouse", clientX: 200, clientY: 0 });
    fireEvent(element, move);
    expect(element.style.getPropertyValue("--tilt-y")).toBe("");
  });
});
