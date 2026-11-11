BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_agreement_digital (
 sale_id text PRIMARY KEY REFERENCES oc_client_commitments(sale_id),
 pdf_hash text NOT NULL CHECK(length(pdf_hash)=64),
 terms_hash text NOT NULL CHECK(length(terms_hash)=64),
 representative_id text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT now(),
 legal_limit numeric NOT NULL CHECK(legal_limit>0 AND legal_limit<=100),
 legal_reference text NOT NULL,
 request_id uuid,
 email_hash text,
 code_hash text,
 expires_at timestamptz,
 resend_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 signed_at timestamptz,
 copy_retry_at timestamptz,
 mail_accepted_at timestamptz
);
COMMIT;
