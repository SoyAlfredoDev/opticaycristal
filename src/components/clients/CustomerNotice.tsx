import styles from "./CustomerNotice.module.css";
export const CUSTOMER_NOTICE = "Por ahora, todos nuestros créditos están disponibles solo en nuestra óptica. Estamos trabajando para que puedas comprar desde la web con un asistente de IA especializado en asesoría de ventas.";
export function CustomerNotice() {
  return <section className={styles.notice} aria-label="Avisos de la óptica">
    <p className={styles.srOnly}>{CUSTOMER_NOTICE}</p>
    <div className={styles.viewport} aria-hidden="true"><div className={styles.track}>
      <span className={styles.message}>{CUSTOMER_NOTICE}</span><span className={`${styles.message} ${styles.duplicate}`}>{CUSTOMER_NOTICE}</span>
    </div></div>
  </section>;
}
