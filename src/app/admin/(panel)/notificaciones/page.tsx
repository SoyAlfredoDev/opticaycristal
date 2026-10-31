import {customerAdminSession} from '@/lib/clients/admin';
import {AdminAccessDenied} from '@/components/admin/AdminAccessDenied';
import {AdminNotificationsPage} from '@/components/admin/AdminNotifications';
export const dynamic='force-dynamic';
export default async function NotificationsPage(){if(!await customerAdminSession())return <AdminAccessDenied/>;return <AdminNotificationsPage/>;}
