BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_staff_email_codes (
 user_id text PRIMARY KEY REFERENCES oc_client_user(id),
 request_id uuid NOT NULL, actor text NOT NULL,
 email_hash text NOT NULL, code_hash text,
 expires_at timestamptz NOT NULL, resend_at timestamptz NOT NULL,
 attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 window_started_at timestamptz NOT NULL DEFAULT now(), sent_count smallint NOT NULL DEFAULT 1,
 day_started_at timestamptz NOT NULL DEFAULT now(), day_count smallint NOT NULL DEFAULT 1,
 verified_at timestamptz
);
COMMIT;
