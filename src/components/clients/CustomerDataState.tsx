"use client";
import { useOptionalCustomerData } from "./CustomerDataProvider";
import styles from "./ClientSpace.module.css";
import loading from "./CustomerLoading.module.css";

export function CustomerSkeleton() {
  return <section className={`${styles.panel} ${styles.section} ${loading.skeleton}`} role="status" aria-label="Cargando tus datos">
    <span className={loading.bar} /><span className={`${loading.bar} ${loading.amount}`} /><span className={loading.bar} />
    <span className={loading.caption}>Cargando tus datos…</span>
  </section>;
}
export function CustomerDataState() {
  const data = useOptionalCustomerData();
  if (data?.error) return <section className={`${styles.panel} ${styles.section}`} role="alert"><p>{data.error}</p><button className={`${styles.button} ${styles.section}`} onClick={() => void data.refresh()} disabled={data.refreshing}>Reintentar</button></section>;
  return <CustomerSkeleton />;
}
export function CustomerSyncStatus() {
  const data = useOptionalCustomerData();
  if (!data) return null;
  return <div role="status" className={`${loading.syncStatus} ${styles.small} ${styles.muted}`}>
    {data.customer && (data.error ? <>Mostrando la última información consultada. <button className={styles.textLink} onClick={() => void data.refresh()} disabled={data.refreshing}>Actualizar</button></> : data.refreshing ? "Actualizando datos…" : null)}
  </div>;
}
