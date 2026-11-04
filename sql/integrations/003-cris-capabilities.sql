BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE oc_client_integration_events ADD COLUMN IF NOT EXISTS http_status integer;
ALTER TABLE oc_client_integration_events ADD COLUMN IF NOT EXISTS duration_ms integer;
CREATE TABLE IF NOT EXISTS oc_client_cris_nonces (
 key_id text NOT NULL, nonce_hash text NOT NULL, expires_at timestamptz NOT NULL,
 PRIMARY KEY(key_id,nonce_hash)
);
CREATE INDEX IF NOT EXISTS oc_client_cris_nonces_expiry ON oc_client_cris_nonces(expires_at);
CREATE TABLE IF NOT EXISTS oc_client_cris_receipts (
 id uuid PRIMARY KEY, key_id text NOT NULL, request_hash text NOT NULL, payload_hash text NOT NULL,
 customer_id text NOT NULL REFERENCES oc_client_user(id), ticket_id uuid NOT NULL REFERENCES oc_client_support_tickets(id),
 kind text NOT NULL CHECK(kind IN ('ticket','evaluacion','jornada','convenio','comprobante')),
 state text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(state='PENDING_REVIEW'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(key_id,request_hash)
);
CREATE TABLE IF NOT EXISTS oc_client_cris_attachments (
 id uuid PRIMARY KEY, key_id text NOT NULL, customer_id text NOT NULL REFERENCES oc_client_user(id),
 ticket_id uuid REFERENCES oc_client_support_tickets(id), mime text NOT NULL CHECK(mime IN ('image/jpeg','image/png','application/pdf')),
 size integer NOT NULL CHECK(size BETWEEN 1 AND 1048576), content_hash text NOT NULL,
 payload_enc text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 request_hash text NOT NULL, payload_hash text NOT NULL, UNIQUE(key_id,request_hash)
);
CREATE INDEX IF NOT EXISTS oc_client_cris_attachments_expiry ON oc_client_cris_attachments(expires_at);
CREATE INDEX IF NOT EXISTS oc_client_cris_attachments_owner ON oc_client_cris_attachments(customer_id,expires_at);
COMMIT;
