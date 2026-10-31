"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CustomerProfile } from "@/lib/clients/types";

export const CUSTOMER_REFRESH_MS = 45_000;
const NAVIGATION_FRESH_MS = 15_000;
const SESSION_CHANNEL = "oc-customer-session";
type Snapshot = { customer: CustomerProfile; tiers: CustomerProfile["tier"][] };
type CustomerData = {
  customer: CustomerProfile | null; tiers: CustomerProfile["tier"][];
  viewer: { firstName: string; lastName: string }; refreshing: boolean; error: string;
  refresh: () => Promise<void>; clear: () => void;
};
const Context = createContext<CustomerData | null>(null);

/** Private, tab-local memory. Never placed in browser storage or a shared module cache. */
export function CustomerDataProvider({ ownerId, viewer, children }: {
  ownerId: string; viewer: CustomerData["viewer"]; children: ReactNode;
}) {
  const router = useRouter(), path = usePathname();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false), [error, setError] = useState("");
  const request = useRef<AbortController | null>(null), pending = useRef<Promise<void> | null>(null);
  const etag = useRef(""), checkedAt = useRef(0), stopped = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  const clear = useCallback(() => {
    stopped.current = true;
    request.current?.abort(); request.current = null; pending.current = null;
    etag.current = ""; checkedAt.current = 0;
    setSnapshot(null); setRefreshing(false); setError("");
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (stopped.current) return Promise.resolve();
    if (pending.current) return pending.current;
    const controller = new AbortController(); request.current = controller;
    setRefreshing(true);
    const task = (async () => {
      try {
        const response = await fetch("/api/clientes/perfil", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
          headers: etag.current ? { "If-None-Match": etag.current } : {},
        });
        if (controller.signal.aborted || stopped.current) return;
        if (response.status === 401 || response.status === 404) {
          clear(); router.replace("/mi-cuenta/ingresar"); router.refresh(); return;
        }
        if (response.status === 304) {
          checkedAt.current = Date.now(); setError(""); return;
        }
        if (!response.ok) throw new Error("No pudimos actualizar tus datos.");
        const body = await response.json() as Snapshot;
        if (controller.signal.aborted || stopped.current) return;
        if (!body.customer || body.customer.id !== ownerId) {
          clear(); router.replace("/mi-cuenta/ingresar"); router.refresh(); return;
        }
        etag.current = response.headers.get("ETag") ?? "";
        checkedAt.current = Date.now();
        setSnapshot({ customer: body.customer, tiers: body.tiers }); setError("");
      } catch {
        if (!controller.signal.aborted && !stopped.current) setError("No pudimos actualizar los datos. Reintenta cuando tengas conexión.");
      } finally {
        if (request.current === controller) {
          request.current = null; pending.current = null; setRefreshing(false);
        }
      }
    })();
    pending.current = task;
    return task;
  }, [clear, ownerId, router]);

  useEffect(() => {
    stopped.current = false;
    void refresh();
    const visible = () => document.visibilityState !== "hidden";
    const update = () => { if (visible()) void refresh(); };
    const timer = window.setInterval(update, CUSTOMER_REFRESH_MS);
    window.addEventListener("focus", update); window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SESSION_CHANNEL);
      channel.current.onmessage = event => {
        if (event.data !== "signed-out") return;
        clear(); router.replace("/mi-cuenta/ingresar"); router.refresh();
      };
    }
    return () => {
      stopped.current = true; request.current?.abort(); request.current = null; pending.current = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", update); window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", update);
      channel.current?.close(); channel.current = null;
    };
  }, [clear, refresh, router]);

  useEffect(() => {
    if (checkedAt.current && Date.now() - checkedAt.current >= NAVIGATION_FRESH_MS) void refresh();
  }, [path, refresh]);

  const leave = useCallback(() => { clear(); channel.current?.postMessage("signed-out"); }, [clear]);
  return <Context.Provider value={{ customer: snapshot?.customer ?? null, tiers: snapshot?.tiers ?? [], viewer, refreshing, error, refresh, clear: leave }}>{children}</Context.Provider>;
}

export function useCustomerData() {
  const value = useContext(Context);
  if (!value) throw new Error("Los datos del cliente requieren su sesión privada.");
  return value;
}
export function useOptionalCustomerData() { return useContext(Context); }
