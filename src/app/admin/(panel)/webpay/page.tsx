import { Suspense } from 'react';
import { customerAdminSession } from '@/lib/clients/admin';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { WebpayPayments } from '@/components/clients/WebpayPayments';
import styles from '@/components/clients/ClientSpace.module.css';
export const dynamic = 'force-dynamic';
export default async function Page() { if (!await customerAdminSession())
    return <AdminAccessDenied />; return <div className={styles.space}><main className={styles.main} id="contenido-principal"><h1>Cobros Webpay</h1><Suspense fallback={<p>Cargando cobros…</p>}><WebpayPayments admin/></Suspense></main></div>; }
