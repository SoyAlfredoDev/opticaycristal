BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_profile_changes (
 id uuid PRIMARY KEY, customer_id text NOT NULL REFERENCES oc_client_user(id),
 actor text NOT NULL, payload_enc text NOT NULL, changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS oc_client_profile_changes_customer_idx ON oc_client_profile_changes(customer_id,changed_at DESC);
CREATE TABLE IF NOT EXISTS oc_client_email_reservations (
 email text PRIMARY KEY, customer_id text NOT NULL REFERENCES oc_client_user(id), expires_at timestamptz NOT NULL
);
CREATE OR REPLACE FUNCTION oc_guard_reserved_customer_email() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.email=OLD.email THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('oc-email:'||lower(btrim(NEW.email)),0));
 IF EXISTS(SELECT 1 FROM oc_client_email_reservations WHERE email=lower(btrim(NEW.email)) AND customer_id<>NEW.id AND expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'Email temporarily unavailable' USING ERRCODE='23505',CONSTRAINT='oc_client_email_reserved';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_customer_reserved_email ON oc_client_user;
CREATE TRIGGER oc_customer_reserved_email BEFORE INSERT OR UPDATE OF email ON oc_client_user FOR EACH ROW EXECUTE FUNCTION oc_guard_reserved_customer_email();
COMMIT;
