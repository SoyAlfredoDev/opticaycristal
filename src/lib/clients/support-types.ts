export type TicketStatus = "abierto" | "respondido" | "resuelto";
export const ticketLabels: Record<TicketStatus, string> = { abierto: "Pendiente", respondido: "Respondido", resuelto: "Resuelto" };
export type TicketSummary = {
  id: string; folio: string; subject: string; status: TicketStatus; createdAt: string; updatedAt: string;
  customer?: { id: string; name: string; email: string };
};
export type TicketMessage = { id: string; role: "customer" | "admin"; body: string; createdAt: string };
export type TicketDetail = TicketSummary & { messages: TicketMessage[] };
export type TicketList = { tickets: TicketSummary[]; hasMore: boolean };
