import {getSession} from '@/lib/auth';
import {AdminAccessDenied} from '@/components/admin/AdminAccessDenied';
import {AdminNotificationsPage} from '@/components/admin/AdminNotifications';
export const dynamic='force-dynamic';
export default async function NotificationsPage(){if(!await getSession())return <AdminAccessDenied/>;return <AdminNotificationsPage/>;}
