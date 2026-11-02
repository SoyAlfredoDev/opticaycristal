BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_contract_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 payload_enc text NOT NULL,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oc_client_commitments (
 sale_id text PRIMARY KEY REFERENCES oc_client_sales(id),
 user_id text NOT NULL REFERENCES oc_client_user(id),
 version text NOT NULL,
 payload_enc text NOT NULL,
 content_hash text NOT NULL CHECK(length(content_hash)=64),
 prepared_by text NOT NULL,
 prepared_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_client_commitments_user_idx ON oc_client_commitments(user_id,sale_id);
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS interest_amount integer NOT NULL DEFAULT 0;
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS interest_waived integer NOT NULL DEFAULT 0;
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS interest_waiver_reason text;
ALTER TABLE oc_client_payments DROP CONSTRAINT IF EXISTS oc_client_payments_amount_check;
ALTER TABLE oc_client_payments DROP CONSTRAINT IF EXISTS oc_client_payments_capital_check;
ALTER TABLE oc_client_payments ADD CONSTRAINT oc_client_payments_capital_check CHECK(amount>=0 AND interest_amount>=0 AND interest_waived>=0 AND amount::bigint+interest_amount+interest_waived>0 AND (interest_waived=0 OR (interest_waiver_reason IS NOT NULL AND length(interest_waiver_reason) BETWEEN 3 AND 240)));
COMMIT;
