import { afterEach, expect, it, vi } from "vitest";
import { customerRequest, CUSTOMER_REQUEST_TIMEOUT_MS } from "./customer-request";
afterEach(() => vi.useRealTimers());

it("limita también la espera del cuerpo y cancela la lectura subyacente", async () => {
  vi.useFakeTimers();
  let signal!: AbortSignal;
  const result = customerRequest(async value => {
    signal = value;
    await Promise.resolve();
    return new Promise<never>(() => {});
  }, new AbortController().signal);
  const assertion = expect(result).rejects.toThrow(/tardó demasiado/);
  await vi.advanceTimersByTimeAsync(CUSTOMER_REQUEST_TIMEOUT_MS);
  await assertion;
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("cancela al abandonar la pantalla y limpia el temporizador", async () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  const result = customerRequest(() => new Promise<never>(() => {}), parent.signal);
  const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" });
  parent.abort(); await assertion;
  expect(vi.getTimerCount()).toBe(0);
});

it("no inicia lecturas si la pantalla ya fue abandonada", async () => {
  const parent = new AbortController(); parent.abort();
  const read = vi.fn();
  await expect(customerRequest(read, parent.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(read).not.toHaveBeenCalled();
});
