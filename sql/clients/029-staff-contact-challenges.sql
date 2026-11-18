BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_staff_contact_challenges (
 subject_hash text PRIMARY KEY,
 request_id uuid NOT NULL,
 actor text NOT NULL,
 email_hash text NOT NULL,
 code_hash text,
 sent_at timestamptz,
 expires_at timestamptz NOT NULL,
 attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS oc_client_staff_contact_challenges_expiry_idx
 ON oc_client_staff_contact_challenges(expires_at);
COMMIT;
