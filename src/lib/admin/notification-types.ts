export const NOTIFICATION_KINDS = ['survey_received','ticket_created','customer_reply','mail_failed','customer_registered','sale_created','payment_received','order_received','request_received'] as const;
export type NotificationKind = typeof NOTIFICATION_KINDS[number];
export const NOTIFICATION_FILTERS = ['all','customers','sales','orders','requests','support'] as const;
export type NotificationFilter = typeof NOTIFICATION_FILTERS[number];
export type AdminNotification = {id:string;kind:NotificationKind;ticketId?:string;entityId?:string;folio:string;createdAt:string;read:boolean;label:string;href:string};
export type AdminNotificationFeed = {items:AdminNotification[];unreadCount:number;hasMore:boolean;asOf:string};
