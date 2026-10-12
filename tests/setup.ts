import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { createElement } from "react";

afterEach(() => cleanup());

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; fill?: boolean; priority?: boolean; sizes?: string; quality?: number; width?: number; height?: number }) => {
    const { fill, priority, sizes, quality, ...htmlProps } = props;
    void fill; void priority; void sizes; void quality;
    return createElement("img", { src, alt, ...htmlProps });
  },
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value() { this.open = true; },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value() { this.open = false; this.dispatchEvent(new Event("close")); },
});
