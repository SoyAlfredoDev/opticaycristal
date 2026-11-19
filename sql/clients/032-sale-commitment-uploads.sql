BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF to_regclass('oc_client_agreement_acceptances') IS NULL THEN
    RAISE EXCEPTION 'Apply document migrations 010 and 019 before 032';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS oc_client_sale_commitment_uploads (
  id uuid PRIMARY KEY,
  sale_id text NOT NULL UNIQUE REFERENCES oc_client_sales(id),
  request_key uuid NOT NULL UNIQUE,
  input_hash text NOT NULL CHECK(length(input_hash)=64),
  content_hash text NOT NULL CHECK(length(content_hash)=64),
  payload_enc text NOT NULL,
  size integer NOT NULL CHECK(size BETWEEN 1 AND 3145728),
  pages integer NOT NULL CHECK(pages BETWEEN 1 AND 30),
  source_count integer NOT NULL CHECK(source_count BETWEEN 1 AND 4),
  uploaded_by text NOT NULL CHECK(length(uploaded_by) BETWEEN 1 AND 200),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION oc_client_preserve_commitment_upload() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Commitment uploads are immutable'; END; $$;
DROP TRIGGER IF EXISTS oc_client_preserve_commitment_upload ON oc_client_sale_commitment_uploads;
CREATE TRIGGER oc_client_preserve_commitment_upload BEFORE UPDATE OR DELETE ON oc_client_sale_commitment_uploads
FOR EACH ROW EXECUTE FUNCTION oc_client_preserve_commitment_upload();
COMMIT;
