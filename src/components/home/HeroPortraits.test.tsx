import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroPortraits } from "./HeroPortraits";
import { HERO_INTERVAL_MS, nextReadyPortrait } from "./portrait-data";

describe("HeroPortraits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockImplementation(query => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  function loadPhotos() {
    document.querySelectorAll("img").forEach(image => fireEvent.load(image));
  }
  function active() {
    return screen.getByRole("group", { name: "Personas usando lentes ópticos" }).getAttribute("data-active-portrait");
  }

  it("keeps the first portrait when the other photos are not ready", () => {
    render(<HeroPortraits />);
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
    expect(active()).toBe("young");
  });

  it("rotates loaded portraits and can pause and resume", () => {
    render(<HeroPortraits />);
    loadPhotos();
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS));
    expect(active()).toBe("professional");
    fireEvent.click(screen.getByRole("button", { name: "Pausar retratos" }));
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
    expect(active()).toBe("professional");
    fireEvent.click(screen.getByRole("button", { name: "Reanudar retratos" }));
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS));
    expect(active()).toBe("young");
  });

  it("pauses after a manual selection", () => {
    render(<HeroPortraits />);
    loadPhotos();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar pareja" }));
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
    expect(active()).toBe("professional");
    expect(screen.getByRole("button", { name: "Mostrar pareja" })).toHaveAttribute("aria-pressed", "true");
  });

  it("skips unavailable photographs and wraps around", () => {
    expect(nextReadyPortrait(0, [true, false, true, false])).toBe(2);
    expect(nextReadyPortrait(3, [true, false, false, true])).toBe(0);
    expect(nextReadyPortrait(0, [true, false, false, false])).toBe(0);
  });

  it("does not autoplay when reduced motion is requested", () => {
    const media = window.matchMedia(motionQuery);
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    render(<HeroPortraits />);
    loadPhotos();
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 3));
    expect(active()).toBe("young");
    expect(screen.getByRole("button", { name: "Reanudar retratos" })).toBeDisabled();
  });

  it("stops while the document is hidden and resumes when visible", () => {
    render(<HeroPortraits />);
    loadPhotos();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS * 2));
    expect(active()).toBe("young");
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(HERO_INTERVAL_MS));
    expect(active()).toBe("professional");
  });
});

const motionQuery = "(prefers-reduced-motion: reduce)";
