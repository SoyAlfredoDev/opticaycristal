BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_support_mail (
 id uuid PRIMARY KEY,
 ticket_id uuid NOT NULL REFERENCES oc_client_support_tickets(id) ON DELETE CASCADE,
 message_id uuid NOT NULL UNIQUE REFERENCES oc_client_support_messages(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('ticket_created','staff_reply')),
 payload_cipher text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed','unverified')),
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 lease_token uuid,
 provider_id text,
 failure_code text
);
CREATE INDEX IF NOT EXISTS oc_client_support_mail_queue_idx ON oc_client_support_mail(state,next_attempt_at);
CREATE INDEX IF NOT EXISTS oc_client_support_mail_ticket_idx ON oc_client_support_mail(ticket_id,created_at DESC);
COMMIT;
