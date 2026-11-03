/** Bound the whole read, including its body, so a stalled request never locks refresh. */
export const CUSTOMER_REQUEST_TIMEOUT_MS = 12_000;

export async function customerRequest<T>(read: (signal: AbortSignal) => Promise<T>, parent: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new DOMException("Consulta cancelada", "AbortError"));
    };
    if (parent.aborted) { cancel(); return; }
    parent.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("La consulta tardó demasiado. Inténtalo nuevamente."));
    }, CUSTOMER_REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([interrupted, parent.aborted ? interrupted : read(controller.signal)]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", cancel);
  }
}
