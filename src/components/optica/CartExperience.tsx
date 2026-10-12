"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { SiteDialog } from "@/components/site/SiteDialog";
import site from "@/components/site/Site.module.css";
import styles from "@/components/site/Views.module.css";
import { products, type Product } from "./catalog";
import { ProductCatalog } from "./ProductCatalog";

type CartEntry = { productId: string; quantity: number };
const STORAGE_KEY = "oc_cart_v1";

export function CartExperience() {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const dialogTitle = useId();
  const submitLock = useRef(false);
  const quantity = cart.reduce((total, entry) => total + entry.quantity, 0);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      await Promise.resolve();
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (!cancelled && Array.isArray(stored)) setCart(stored.filter((item): item is CartEntry => Boolean(item && typeof item.productId === "string" && products.some((product) => product.id === item.productId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10)));
      } catch { localStorage.removeItem(STORAGE_KEY); }
      if (!cancelled) setReady(true);
    }
    void restore();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }, [cart, ready]);

  const add = useCallback((product: Product) => {
    setSuccess(false); setError("");
    setCart((items) => {
      const current = items.find((entry) => entry.productId === product.id);
      return current ? items.map((entry) => entry.productId === product.id ? { ...entry, quantity: Math.min(10, entry.quantity + 1) } : entry) : [...items, { productId: product.id, quantity: 1 }];
    });
  }, []);

  function update(id: string, delta: number) {
    setCart((items) => items.flatMap((entry) => entry.productId !== id ? [entry] : entry.quantity + delta < 1 ? [] : [{ ...entry, quantity: Math.min(10, entry.quantity + delta) }]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !cart.length) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    submitLock.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart, customer: { name: data.get("name"), email: data.get("email"), phone: data.get("phone"), comuna: data.get("comuna"), address: data.get("address"), comments: data.get("comments"), consent: data.get("consent") === "on" } }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error ?? "No pudimos enviar tu solicitud."); return; }
      setCart([]); form.reset(); setSuccess(true);
    } catch { setError("No hay conexión con el servidor. Inténtalo de nuevo."); }
    finally { setPending(false); submitLock.current = false; }
  }

  return <>
    <div className={styles.cartBar}><p>¿Te interesa algún modelo? Agrégalo y envíanos tu solicitud de compra.</p><button type="button" className={`${site.button} ${site.primary}`} onClick={() => setOpen(true)} disabled={!ready}><ShoppingBag size={17} aria-hidden="true" /> Carro ({quantity})</button></div>
    <ProductCatalog onAddToCart={add} cartReady={ready} />
    <SiteDialog open={open} onClose={() => setOpen(false)} titleId={dialogTitle} className={styles.cartDialog}>
      <div className={styles.cartContent}>
        <p className={styles.cartEyebrow}>Óptica &amp; Cristal</p>
        <h2 id={dialogTitle}>Tu carro</h2>
        {success ? <div className={styles.cartSuccess} role="status"><ShoppingBag size={32} /><h3>Solicitud recibida</h3><p>El equipo revisará los modelos, precios y disponibilidad y te contactará para confirmar tu compra.</p><button type="button" className={`${site.button} ${site.primary}`} onClick={() => { setSuccess(false); setOpen(false); }}>Seguir explorando</button></div> : <>
          <p className={styles.cartDescription}>Envía los modelos que te interesan. Te confirmaremos precio, disponibilidad y despacho antes de concretar la compra.</p>
          {cart.length ? <>
            <ul className={styles.cartItems}>{cart.map((entry) => {
              const product = products.find((item) => item.id === entry.productId);
              if (!product) return null;
              return <li key={entry.productId} className={styles.cartItem}>
                <Image src={product.image} alt="" width={88} height={72} />
                <div className={styles.cartItemInfo}><h3>{product.title}</h3><span>Precio a confirmar</span>
                  <div className={styles.quantityControl}><button type="button" aria-label={`Quitar una unidad de ${product.title}`} onClick={() => update(entry.productId, -1)}><Minus size={15} /></button><span aria-live="polite">{entry.quantity}</span><button type="button" aria-label={`Agregar una unidad de ${product.title}`} onClick={() => update(entry.productId, 1)} disabled={entry.quantity >= 10}><Plus size={15} /></button><button type="button" aria-label={`Eliminar ${product.title}`} onClick={() => update(entry.productId, -entry.quantity)}><Trash2 size={15} /></button></div>
                </div>
              </li>;
            })}</ul>
            <form className={styles.checkoutForm} onSubmit={submit}>
              <h3>Datos para contactarte</h3>
              <div className={styles.formGrid}>
                <label className={styles.field}>Nombre completo<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
                <label className={styles.field}>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={190} /></label>
                <label className={styles.field}>Teléfono<input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={40} /></label>
                <label className={styles.field}>Comuna<input name="comuna" autoComplete="address-level2" required minLength={2} maxLength={100} /></label>
                <label className={`${styles.field} ${styles.fullField}`}>Dirección para consultar despacho<input name="address" autoComplete="street-address" required minLength={4} maxLength={220} /></label>
                <label className={`${styles.field} ${styles.fullField}`}>Comentario (opcional)<textarea name="comments" maxLength={700} /></label>
              </div>
              <label className={styles.cartConsent}><input name="consent" type="checkbox" required /> <span>Autorizo el uso de estos datos para gestionar esta solicitud. Lee nuestra <a href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</a>.</span></label>
              {error && <p className={styles.cartError} role="alert">{error}</p>}
              <button className={`${site.button} ${site.primary} ${styles.cartSubmit}`} disabled={pending}>{pending ? "Enviando solicitud…" : "Enviar solicitud de compra"}</button>
              <p className={styles.cartFinePrint}>Esta solicitud no genera un cobro. Confirmaremos precio, disponibilidad y despacho contigo.</p>
            </form>
          </> : <p className={styles.cartEmpty}>Tu carro está vacío. Agrega productos del catálogo para solicitar información de compra.</p>}
        </>}
      </div>
    </SiteDialog>
  </>;
}
