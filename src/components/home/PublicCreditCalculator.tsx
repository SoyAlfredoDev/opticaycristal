"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { clp, type CustomerProfile } from "@/lib/clients/types";
import { parsePurchasePrice, simulatePurchase, type PurchaseSimulation } from "@/lib/clients/purchase-simulation";
import styles from "./PublicCreditCalculator.module.css";

type Tier = CustomerProfile["tier"];

export function PublicCreditCalculator({ tiers }: { tiers: Tier[] }) {
  const [price, setPrice] = useState("");
  const [level, setLevel] = useState(tiers.find(tier => tier.code === "start")?.code ?? tiers[0]?.code ?? "");
  const [count, setCount] = useState(1);
  const [result, setResult] = useState<PurchaseSimulation | null>(null);
  const [error, setError] = useState("");
  const tier = tiers.find(item => item.code === level);

  function clearEstimate() {
    setResult(null);
    setError("");
  }

  function estimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tier) return;
    try {
      setError("");
      // A public estimate assumes the category's full limit is available.
      setResult(simulatePurchase(parsePurchasePrice(price), count, { tier, outstanding: 0, emailVerified: true }));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "No pudimos calcular tu compra.");
    }
  }

  return (
    <section id="simulador" className={styles.section} aria-labelledby="simulator-title">
      <div className={styles.container}>
        <h2 id="simulator-title">Simula tu crédito directo</h2>
        <p>Descubre cuánto pagarías de pie y cuánto pagarías cada mes.</p>
        <div className={styles.grid}>
          <form onSubmit={estimate} className={styles.form}>
            <label>Precio de los lentes (CLP)
              <input inputMode="numeric" required placeholder="Ej. 75.000" value={price}
                onChange={event => { setPrice(event.target.value); clearEstimate(); }} />
            </label>
            <label>Categoría de crédito
              <select value={level} disabled={!tier} onChange={event => {
                setLevel(event.target.value);
                setCount(1);
                clearEstimate();
              }}>
                {!tier && <option value="">No disponible</option>}
                {tiers.map(item => <option value={item.code} key={item.code}>{item.name}</option>)}
              </select>
            </label>
            <label>Cuotas mensuales
              <select value={count} disabled={!tier} onChange={event => {
                setCount(Number(event.target.value));
                clearEstimate();
              }}>
                {Array.from({ length: tier?.maxInstallments ?? 1 }, (_, index) =>
                  <option key={index} value={index + 1}>{index + 1} {index === 0 ? "cuota" : "cuotas"}</option>)}
              </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" className={styles.primary} disabled={!tier}>Calcular mi compra</button>
          </form>
          <div className={styles.summary} aria-live="polite">
            <h3>Cómo pagarías tus lentes</h3>
            {result ? <>
              <dl>
                <div><dt>Pie al comprar</dt><dd>{clp(result.deposit)}</dd></div>
                <div><dt>Monto a crédito</dt><dd>{clp(result.credit)}</dd></div>
                <div><dt>Precio total</dt><dd>{clp(result.total)}</dd></div>
              </dl>
              {result.installments.length ? <ol>
                {result.installments.map((amount, index) =>
                  <li key={index}><span>Cuota {index + 1} · mes {index + 1}</span><strong>{clp(amount)}</strong></li>)}
              </ol> : <p>Con este monto, el pago sería al contado.</p>}
            </> : <p>{tier ? "Ingresa el precio y elige tu categoría para ver el detalle." : "Las condiciones no están disponibles en este momento. Puedes consultar tu cupo en Mi cuenta."}</p>}
            <p className={styles.note}>Simulación referencial con el cupo completo de la categoría. La compra es presencial y las fechas de pago se confirman en la óptica.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/mi-cuenta/registro">Crear mi cuenta</Link>
              <Link className={styles.secondary} href="/mi-cuenta/ingresar">Iniciar sesión</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
