BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_support_tickets (
 id uuid PRIMARY KEY,
 folio bigserial UNIQUE NOT NULL,
 customer_id text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
 subject_cipher text NOT NULL,
 request_key uuid NOT NULL,
 status text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','respondido','resuelto')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,request_key)
);
CREATE INDEX IF NOT EXISTS oc_client_support_customer_idx ON oc_client_support_tickets(customer_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS oc_client_support_status_idx ON oc_client_support_tickets(status,updated_at DESC);
CREATE TABLE IF NOT EXISTS oc_client_support_messages (
 id uuid PRIMARY KEY,
 position bigserial UNIQUE NOT NULL,
 ticket_id uuid NOT NULL REFERENCES oc_client_support_tickets(id) ON DELETE CASCADE,
 actor_kind text NOT NULL CHECK (actor_kind IN ('customer','admin')),
 author_id text NOT NULL,
 event text NOT NULL DEFAULT 'message' CHECK(event IN ('message','resolved')),
 body_cipher text NOT NULL,
 request_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(ticket_id,request_key)
);
CREATE INDEX IF NOT EXISTS oc_client_support_thread_idx ON oc_client_support_messages(ticket_id,position);
CREATE INDEX IF NOT EXISTS oc_client_support_rate_idx ON oc_client_support_messages(actor_kind,author_id,created_at);
COMMIT;
