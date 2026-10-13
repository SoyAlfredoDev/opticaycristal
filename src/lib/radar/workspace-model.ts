export const relationshipLabels = {
  prospecto: "Prospecto",
  perdido: "Perdido",
  jornada: "Jornada",
  convenio: "Convenio",
  ambas: "Jornada y convenio",
} as const;
export const followupLabels = {
  new: "Respuesta nueva",
  working: "En gestión",
  interested: "Interesado",
  proposal: "Propuesta enviada",
  closed: "Resuelto",
  not_interested: "Sin interés",
  quarantine: "Por verificar",
  automatic: "Respuesta automática",
} as const;
export type WorkspaceContact = {
  id: string;
  email: string;
  name: string;
  status: string;
  marketing_ready: boolean;
  suppression_reason?: string;
};
export type WorkspaceCompany = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  relationship_status: keyof typeof relationshipLabels;
  employee_estimate: number | null;
  source: string;
  contacts: WorkspaceContact[];
  sent_count: number;
  last_sent_at: string | null;
};
export type Followup = {
  id: string;
  prospect_id: string;
  company_name: string;
  email: string | null;
  source: string;
  subject: string;
  message: string;
  status: keyof typeof followupLabels;
  owner: string;
  next_action: string;
  due_at: string;
  received_at: string;
};
export type WorkspaceData = {
  companies: WorkspaceCompany[];
  page: number;
  hasMore: boolean;
  followups: Followup[];
  followupsTruncated: boolean;
  kpis: {
    companies: number;
    withEmail: number;
    uniqueEmails: number;
    ready: number;
    pending: number;
    sent: number;
    delivered: number;
    noOpen: number;
    rejected: number;
    opened: number;
    clicked: number;
    replied: number;
    interested: number;
    followups: number;
    bounced: number;
    unsubscribed: number;
  };
  configuration: {
    inboundReady: boolean;
    inboundDomain: string;
    sendingEnabled: boolean;
  };
};
