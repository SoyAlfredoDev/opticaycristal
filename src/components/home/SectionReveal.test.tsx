import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionReveal } from "./SectionReveal";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("SectionReveal", () => {
  it("deja el contenido visible si no existe IntersectionObserver", () => {
    render(<SectionReveal><p>Siempre legible</p></SectionReveal>);
    expect(screen.getByText("Siempre legible").parentElement).not.toHaveAttribute("data-reveal", "pending");
  });
  it("revela una sección fuera de pantalla y limpia el observer", () => {
    let callback: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 2000 } as DOMRect);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { callback = cb; }
      observe = vi.fn(); disconnect = disconnect;
    });
    const { unmount } = render(<SectionReveal><p>Sección</p></SectionReveal>);
    const element = screen.getByText("Sección").parentElement;
    expect(element).toHaveAttribute("data-reveal", "pending");
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(element).toHaveAttribute("data-reveal", "visible");
    expect(disconnect).not.toHaveBeenCalled();
    act(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(element).toHaveAttribute("data-reveal", "pending");
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(element).toHaveAttribute("data-reveal", "visible");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
  it("respeta la preferencia de movimiento reducido", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", class { observe = observe; disconnect = vi.fn(); });
    render(<SectionReveal><p>Sin movimiento</p></SectionReveal>);
    expect(observe).not.toHaveBeenCalled();
    expect(screen.getByText("Sin movimiento").parentElement).not.toHaveAttribute("data-reveal", "pending");
  });
  it("muestra el contenido y reanuda la observación al cambiar la preferencia", () => {
    let onChange = () => {};
    let callback: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    const preference = {
      matches: false,
      addEventListener: vi.fn((_event: string, listener: () => void) => { onChange = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, "matchMedia").mockReturnValue(preference as unknown as MediaQueryList);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { callback = cb; }
      observe = observe; disconnect = disconnect;
    });
    const { unmount } = render(<SectionReveal><p>Preferencia dinámica</p></SectionReveal>);
    const element = screen.getByText("Preferencia dinámica").parentElement;
    act(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(element).toHaveAttribute("data-reveal", "pending");
    act(() => { preference.matches = true; onChange(); });
    expect(element).toHaveAttribute("data-reveal", "visible");
    expect(disconnect).toHaveBeenCalledTimes(1);
    act(() => { preference.matches = false; onChange(); });
    expect(observe).toHaveBeenCalledTimes(2);
    unmount();
    expect(preference.removeEventListener).toHaveBeenCalledWith("change", onChange);
  });
});
