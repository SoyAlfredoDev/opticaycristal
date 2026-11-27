import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FrameAdvisorExamples } from "./FrameAdvisorExamples";

function advanceExample() {
  act(() => vi.advanceTimersByTime(8000));
}

describe("FrameAdvisorExamples", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("changes the three frames as a group and loops back to the first person", () => {
    render(<FrameAdvisorExamples />);
    expect(screen.getAllByRole("img", { name: /^Mujer/ })).toHaveLength(3);
    advanceExample();
    expect(screen.getAllByRole("img", { name: /^Hombre/ })).toHaveLength(3);
    expect(screen.queryByRole("img", { name: /^Mujer/ })).not.toBeInTheDocument();
    advanceExample();
    expect(screen.getAllByRole("img", { name: /^Mujer/ })).toHaveLength(3);
  });

  it("starts a new rotation interval after a manual change", () => {
    render(<FrameAdvisorExamples />);
    act(() => vi.advanceTimersByTime(7000));
    fireEvent.click(screen.getByRole("button", { name: "Cambiar ejemplo" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getAllByRole("img", { name: /^Hombre/ })).toHaveLength(3);
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getAllByRole("img", { name: /^Mujer/ })).toHaveLength(3);
  });

  it("allows manual changes with reduced motion enabled", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    render(<FrameAdvisorExamples />);
    advanceExample();
    expect(screen.getAllByRole("img", { name: /^Mujer/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar ejemplo" }));
    expect(screen.getAllByRole("img", { name: /^Hombre/ })).toHaveLength(3);
  });
});
