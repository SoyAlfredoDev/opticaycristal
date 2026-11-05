import { customerAdminSession } from '@/lib/clients/admin';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminSurveys } from '@/components/surveys/AdminSurveys';
import styles from '@/components/clients/ClientSpace.module.css';
export const dynamic = 'force-dynamic';
export default async function Page() { if (!await customerAdminSession())
    return <AdminAccessDenied />; return <div className={styles.space}><main className={styles.main} id="contenido-principal"><h1>Encuestas de satisfacción</h1><AdminSurveys /></main></div>; }
