export type TicketStatus = "abierto" | "respondido" | "resuelto";
export const ticketLabels: Record<TicketStatus, string> = { abierto: "Pendiente", respondido: "Respondido", resuelto: "Resuelto" };
export type TicketSummary = {
  id: string; folio: string; subject: string; status: TicketStatus; createdAt: string; updatedAt: string;
  customer?: { id: string; name: string; email: string };
};
export type TicketMessage = { id: string; role: "customer" | "admin"; body: string; createdAt: string };
export type TicketDetail = TicketSummary & { messages: TicketMessage[]; notification?:{kind:"ticket_created"|"staff_reply";state:"pending"|"processing"|"sent"|"failed"|"unverified"} };
export type TicketList = { tickets: TicketSummary[]; hasMore: boolean };

export function requestedSupportTicket(value:unknown) {
 return typeof value==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)?value:"";
}
