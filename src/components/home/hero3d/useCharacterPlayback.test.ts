import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCharacterPlayback } from "./useCharacterPlayback";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("reproducción accesible de personajes", () => {
  it("alterna cada 3,8 segundos y cancela al pausar o desmontar", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const advance = vi.fn();
    const { rerender, unmount } = renderHook(({ enabled }) => useCharacterPlayback(enabled, advance), { initialProps: { enabled: true } });
    act(() => vi.advanceTimersByTime(3799));
    expect(advance).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(advance).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(8000));
    expect(advance).toHaveBeenCalledTimes(1);
    rerender({ enabled: true });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("suspende la secuencia con la pestaña oculta y reinicia sin saltos", () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const advance = vi.fn();
    const { unmount } = renderHook(() => useCharacterPlayback(true, advance));
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(15000));
    expect(advance).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(3800));
    expect(advance).toHaveBeenCalledTimes(1);
    unmount();
  });
});
