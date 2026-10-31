"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerData } from "./CustomerDataProvider";

type Cached<T> = { data: T; etag: string };
/** Small owner-scoped page cache. Changing the account snapshot invalidates it. */
export function useCustomerPage<T>(url: string | null) {
  const { customer, historyCache: cache, historyVersion, clear } = useCustomerData();
  const router = useRouter();
  const ownerId=customer?.id;
  const key = `${historyVersion}:${url}`;
  const [state, setState] = useState<{ key: string; data?: T; error: string; loading: boolean }>({ key:"", error:"", loading:false });
  const [retry, setRetry] = useState(0);
  const force = useRef(false);
  const cached = url ? cache.get(key) as Cached<T> | undefined : undefined;
  const refresh = useCallback(() => { force.current=true; setRetry(count => count+1); }, []);
  useEffect(() => {
    if (!url) return;
    const previous = cache.get(key) as Cached<T> | undefined;
    const forced = force.current; force.current=false;
    if (!forced && previous) return;
    const controller = new AbortController();
    const run = async () => {
      setState({ key, data:previous?.data, error:"", loading:true });
      try {
        const response = await fetch(url, { credentials:"same-origin", cache:"no-store", signal:controller.signal, headers:previous?.etag?{"If-None-Match":previous.etag}:{} });
        if (controller.signal.aborted) return;
        if (response.status===401 || response.status===404) {
          if (response.status===401) { clear(); router.replace("/mi-cuenta/ingresar"); router.refresh(); }
          throw new Error();
        }
        if (response.status!==304 && !response.ok) throw new Error();
        if (response.headers.get("X-Customer-Scope")!==ownerId) {
          clear(); router.replace("/mi-cuenta/ingresar"); router.refresh(); return;
        }
        const data = response.status===304 && previous ? previous.data : await response.json() as T;
        if (controller.signal.aborted) return;
        const value = { data, etag:response.headers.get("ETag")??previous?.etag??"" };
        cache.delete(key); cache.set(key,value);
        while (cache.size>8) cache.delete(cache.keys().next().value!);
        setState({ key, data, error:"", loading:false });
      } catch {
        if (!controller.signal.aborted) setState({ key, data:previous?.data, error:"No pudimos cargar el historial. Inténtalo de nuevo.", loading:false });
      }
    };
    void run();
    return () => controller.abort();
  }, [url,key,cache,retry,clear,router,ownerId]);
  const current = state.key===key ? state : undefined;
  return { data:current?.data??cached?.data, error:current?.error??"", loading:current?.loading??(!cached&&!!url), refresh };
}
