BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE oc_client_category_changes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','automatic'));
CREATE TABLE IF NOT EXISTS oc_client_level_mail (
 id uuid PRIMARY KEY,
 change_id uuid NOT NULL UNIQUE REFERENCES oc_client_category_changes(id) ON DELETE CASCADE,
 customer_id text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
 payload_cipher text NOT NULL,
 state text NOT NULL CHECK(state IN ('pending','processing','accepted','failed','unverified','cancelled','review')),
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 lease_token uuid,
 provider_id text,
 failure_code text
);
CREATE INDEX IF NOT EXISTS oc_client_level_mail_queue_idx ON oc_client_level_mail(state,next_attempt_at);
CREATE INDEX IF NOT EXISTS oc_client_level_mail_customer_idx ON oc_client_level_mail(customer_id,created_at DESC);
COMMIT;
