export const dealStages = [
  "calificacion",
  "reunion",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
] as const;
export const dealLabels: Record<string, string> = {
  calificacion: "Calificación",
  reunion: "Reunión",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};
export type CtaKind = "web" | "whatsapp" | "email";
export type CampaignVariant = {
  id: string;
  kind: CtaKind;
  label: string;
  destination: string;
};
export type CrmContact = {
  id: string;
  prospect_id: string;
  email: string;
  name: string;
  role: string;
  consent_evidence: string;
  consented_at: string;
  status: string;
};
export type CrmTask = {
  id: string;
  prospect_id: string;
  title: string;
  owner: string;
  due_at: string;
  status: string;
  result: string;
};
export type CrmDeal = {
  id: string;
  prospect_id: string;
  title: string;
  offering: string;
  stage: string;
  amount: number;
  owner: string;
  next_action: string;
  close_date: string | null;
  loss_reason: string;
  version: number;
};
export type CrmCampaign = {
  template_id: string;
  id: string;
  name: string;
  objective: string;
  subject: string;
  body: string;
  variants: CampaignVariant[];
  status: string;
  created_at: string;
};
export type CrmDelivery = {
  id: string;
  campaign_id: string;
  contact_id: string;
  variant_id: string;
  status: string;
  error: string | null;
  email: string;
  company_name: string;
  created_at: string;
  provider_id: string | null;
};
export type CrmMetric = {
  campaign_id: string;
  variant_id: string;
  kind: string;
  assigned: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  redirected: number;
  conversations: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  won: number;
};
export type CrmSnapshot = {
  companies: { id: string; name: string }[];
  contacts: CrmContact[];
  tasks: CrmTask[];
  deals: CrmDeal[];
  campaigns: CrmCampaign[];
  deliveries: CrmDelivery[];
  metrics: CrmMetric[];
  events: {
    id: string;
    kind: string;
    occurred_at: string;
    company_name: string;
    source: string;
    metadata: Record<string, unknown>;
  }[];
  configuration: {
    resend: boolean;
    webhook: boolean;
    publicUrl: boolean;
    sendingEnabled: boolean;
    missing: string[];
  };
  truncated: {
    contacts: boolean;
    tasks: boolean;
    deals: boolean;
    deliveries: boolean;
    events: boolean;
  };
};
