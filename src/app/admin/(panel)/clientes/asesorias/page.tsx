import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import styles from "@/components/clients/ClientSpace.module.css";
import { customerAdminSession } from "@/lib/clients/admin";
import { frameAdviceMetrics } from "@/lib/frame-advisor/store";

export const dynamic = "force-dynamic";

export default async function FrameAdviceAdminPage() {
  if (!await customerAdminSession()) return <AdminAccessDenied />;
  const data = await frameAdviceMetrics().catch(() => null);
  return <div className={styles.space}><main className={styles.main} id="contenido-principal">
    <div className={styles.pageIntro}><h1>Asesorías de monturas</h1><p>Uso mensual y opiniones de clientes.</p></div>
    {data ? <>
      <section className={`${styles.panel} ${styles.section}`}>
        <h2>Este mes</h2>
        <dl>
          <dt>Consultas utilizadas</dt><dd>{data.used ?? 0} de {data.monthlyLimit}</dd>
          <dt>Asesorías entregadas</dt><dd>{data.completed}</dd>
          <dt>Calificaciones</dt><dd>{data.rated}</dd>
          <dt>Promedio</dt><dd>{data.average === null ? "Sin calificaciones" : `${data.average} de 5`}</dd>
        </dl>
      </section>
      <section className={`${styles.panel} ${styles.section}`}>
        <h2>Opiniones recientes</h2>
        {data.feedback.length === 0 ? <p>Aún no hay opiniones.</p> : <ul>{data.feedback.map(entry => <li key={entry.id}>
          <strong>{entry.rating} de 5</strong>{entry.feedback && <p>{entry.feedback}</p>}
        </li>)}</ul>}
      </section>
    </> : <p role="status">Todavía no se pueden cargar las asesorías.</p>}
  </main></div>;
}
