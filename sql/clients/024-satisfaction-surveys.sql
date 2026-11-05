BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_surveys(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sale_id text NOT NULL UNIQUE REFERENCES oc_client_sales(id),
 due_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed','skipped')),
 token_hash text UNIQUE,open_hash text UNIQUE,secrets_cipher text,expires_at timestamptz,
 lease uuid,lease_until timestamptz,first_attempt_at timestamptz,attempts integer NOT NULL DEFAULT 0,
 sent_at timestamptz,provider_id text,opened_at timestamptz,visited_at timestamptz,responded_at timestamptz,
 attention smallint CHECK(attention BETWEEN 1 AND 5),platform smallint CHECK(platform BETWEEN 1 AND 5),product smallint CHECK(product BETWEEN 1 AND 5),
 comment_kind text CHECK(comment_kind IN ('suggestion','complaint')),comment_cipher text,answer_hash text,
 CHECK(responded_at IS NULL OR attention IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS oc_client_surveys_queue ON oc_client_surveys(state,due_at);
CREATE OR REPLACE FUNCTION oc_client_queue_survey() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.credit>0 THEN
 INSERT INTO oc_client_surveys(sale_id,due_at) VALUES(NEW.id,(((NEW.created_at AT TIME ZONE 'America/Santiago')::date+1)::timestamp AT TIME ZONE 'America/Santiago')) ON CONFLICT(sale_id) DO NOTHING;
 END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_queue_survey ON oc_client_sales;
CREATE TRIGGER oc_client_queue_survey AFTER INSERT ON oc_client_sales FOR EACH ROW EXECUTE FUNCTION oc_client_queue_survey();
ALTER TABLE oc_client_admin_notifications DROP CONSTRAINT IF EXISTS oc_client_admin_notifications_kind_check;
ALTER TABLE oc_client_admin_notifications ADD CONSTRAINT oc_client_admin_notifications_kind_check CHECK(kind IN ('ticket_created','customer_reply','mail_failed','customer_registered','sale_created','payment_received','order_received','request_received','survey_received'));
ALTER TABLE oc_client_admin_notifications DROP CONSTRAINT IF EXISTS oc_client_admin_notifications_source_check;
ALTER TABLE oc_client_admin_notifications ADD CONSTRAINT oc_client_admin_notifications_source_check CHECK((kind IN ('ticket_created','customer_reply','mail_failed') AND ticket_id IS NOT NULL) OR (kind IN ('customer_registered','sale_created','payment_received','order_received','request_received','survey_received') AND entity_id IS NOT NULL));
COMMIT;
