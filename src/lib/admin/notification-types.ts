export type AdminNotification={id:string;kind:'ticket_created'|'customer_reply'|'mail_failed';ticketId:string;folio:string;createdAt:string;read:boolean;label:string;href:string};
export type AdminNotificationFeed={items:AdminNotification[];unreadCount:number;hasMore:boolean;asOf:string};
