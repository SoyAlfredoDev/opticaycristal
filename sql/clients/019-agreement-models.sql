BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_agreement_models (
 id text PRIMARY KEY, identifier text NOT NULL, version integer NOT NULL CHECK(version>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','retired')),
 definition jsonb NOT NULL, content_hash text NOT NULL CHECK(length(content_hash)=64),
 sample_pdf bytea NOT NULL, sample_hash text NOT NULL CHECK(length(sample_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL, change_note text NOT NULL,
 approved_at timestamptz, approved_by text,
 UNIQUE(identifier,version), CHECK((approved_at IS NULL)=(approved_by IS NULL)),
 CHECK(status NOT IN ('approved','retired') OR approved_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS oc_client_agreement_model_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, model_id text NOT NULL REFERENCES oc_client_agreement_models(id),
 from_status text, to_status text NOT NULL, actor text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oc_client_agreement_acceptances (
 sale_id text PRIMARY KEY REFERENCES oc_client_commitments(sale_id),
 signed_on date NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT now(), confirmed_by text NOT NULL,
 copy_delivered_on date NOT NULL CHECK(copy_delivered_on>=signed_on), delivery_method text NOT NULL CHECK(delivery_method IN ('paper','email','portal')),
 delivery_reference text NOT NULL, original_reference text NOT NULL,
 signed_pdf_enc text NOT NULL, signed_pdf_hash text NOT NULL CHECK(length(signed_pdf_hash)=64),
 legal_annual_limit numeric NOT NULL CHECK(legal_annual_limit>0 AND legal_annual_limit<=100), legal_limit_reference text NOT NULL,
 CHECK(signed_on<=confirmed_at::date), CHECK(copy_delivered_on<=confirmed_at::date)
);
-- No migration of historical snapshots, signatures, debts or settings.
ALTER TABLE oc_client_commitments ADD COLUMN IF NOT EXISTS model_id text REFERENCES oc_client_agreement_models(id);
ALTER TABLE oc_client_commitments ADD COLUMN IF NOT EXISTS pdf_enc text;
ALTER TABLE oc_client_commitments ADD COLUMN IF NOT EXISTS pdf_hash text CHECK(pdf_hash IS NULL OR length(pdf_hash)=64);
CREATE OR REPLACE FUNCTION oc_client_model_initial_state() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN IF NEW.status<>'draft' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL THEN RAISE EXCEPTION 'New models must be drafts'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS oc_client_model_initial_state ON oc_client_agreement_models;
CREATE TRIGGER oc_client_model_initial_state BEFORE INSERT ON oc_client_agreement_models FOR EACH ROW EXECUTE FUNCTION oc_client_model_initial_state();
CREATE OR REPLACE FUNCTION oc_client_approved_issue() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN
 -- Permit the exact legacy writer during rollout and rollback.
 IF NEW.version='2026-11-02-compromiso-v3' AND NEW.model_id IS NULL AND NEW.pdf_enc IS NULL AND NEW.pdf_hash IS NULL THEN
  RETURN NEW;
 END IF;
 IF NEW.model_id IS NULL OR NEW.pdf_enc IS NULL OR NEW.pdf_hash IS NULL THEN RAISE EXCEPTION 'New agreements require an approved model and frozen PDF'; END IF;
 PERFORM 1 FROM oc_client_agreement_models WHERE id=NEW.model_id AND status='approved' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Only approved models may issue new agreements'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_approved_issue ON oc_client_commitments;
CREATE TRIGGER oc_client_approved_issue BEFORE INSERT ON oc_client_commitments FOR EACH ROW EXECUTE FUNCTION oc_client_approved_issue();
CREATE OR REPLACE FUNCTION oc_client_model_guard() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Model history cannot be deleted'; END IF;
 IF (NEW.id,NEW.identifier,NEW.version,NEW.definition,NEW.content_hash,NEW.sample_pdf,NEW.sample_hash,NEW.created_at,NEW.created_by,NEW.change_note) IS DISTINCT FROM (OLD.id,OLD.identifier,OLD.version,OLD.definition,OLD.content_hash,OLD.sample_pdf,OLD.sample_hash,OLD.created_at,OLD.created_by,OLD.change_note) THEN RAISE EXCEPTION 'Clone a new model version to change content or design'; END IF;
 IF NOT ((OLD.status='draft' AND NEW.status='pending') OR (OLD.status='pending' AND NEW.status='approved') OR (OLD.status='approved' AND NEW.status='retired')) THEN RAISE EXCEPTION 'Invalid model transition'; END IF;
 IF OLD.status<>'pending' AND (NEW.approved_by,NEW.approved_at) IS DISTINCT FROM (OLD.approved_by,OLD.approved_at) THEN RAISE EXCEPTION 'Approval history is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_model_guard ON oc_client_agreement_models;
CREATE TRIGGER oc_client_model_guard BEFORE UPDATE OR DELETE ON oc_client_agreement_models FOR EACH ROW EXECUTE FUNCTION oc_client_model_guard();
CREATE OR REPLACE FUNCTION oc_client_agreement_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN RAISE EXCEPTION 'Issued documents and evidence are immutable'; END $$;
DROP TRIGGER IF EXISTS oc_client_commitment_immutable ON oc_client_commitments;
CREATE TRIGGER oc_client_commitment_immutable BEFORE UPDATE OR DELETE ON oc_client_commitments FOR EACH ROW EXECUTE FUNCTION oc_client_agreement_immutable();
DROP TRIGGER IF EXISTS oc_client_acceptance_immutable ON oc_client_agreement_acceptances;
CREATE TRIGGER oc_client_acceptance_immutable BEFORE UPDATE OR DELETE ON oc_client_agreement_acceptances FOR EACH ROW EXECUTE FUNCTION oc_client_agreement_immutable();
DROP TRIGGER IF EXISTS oc_client_model_event_immutable ON oc_client_agreement_model_events;
CREATE TRIGGER oc_client_model_event_immutable BEFORE UPDATE OR DELETE ON oc_client_agreement_model_events FOR EACH ROW EXECUTE FUNCTION oc_client_agreement_immutable();
COMMIT;
