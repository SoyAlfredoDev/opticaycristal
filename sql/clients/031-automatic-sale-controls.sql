BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_sale_control_counter (
 id smallint PRIMARY KEY CHECK(id=1),
 last_number bigint NOT NULL DEFAULT 0 CHECK(last_number>=0)
);
INSERT INTO oc_client_sale_control_counter(id,last_number)
 SELECT 1,COALESCE(MAX(substring(control_number from 4)::numeric),0)::bigint
 FROM oc_client_sale_controls WHERE control_number ~ '^CR-[0-9]+$'
 ON CONFLICT(id) DO UPDATE SET last_number=GREATEST(oc_client_sale_control_counter.last_number,EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION oc_client_generate_sale_control() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE number bigint;
BEGIN
 IF NEW.control_number IS NOT NULL THEN RAISE EXCEPTION 'Sale control is generated automatically'; END IF;
 EXECUTE format('UPDATE %I.oc_client_sale_control_counter SET last_number=last_number+1 WHERE id=1 RETURNING last_number',TG_TABLE_SCHEMA) INTO number;
 IF number IS NULL THEN RAISE EXCEPTION 'Sale counter unavailable'; END IF;
 NEW.control_number:='CR-'||repeat('0',GREATEST(0,7-length(number::text)))||number::text;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS oc_client_auto_sale_control ON oc_client_sale_controls;
CREATE TRIGGER oc_client_auto_sale_control BEFORE INSERT ON oc_client_sale_controls
 FOR EACH ROW EXECUTE FUNCTION oc_client_generate_sale_control();

CREATE TABLE IF NOT EXISTS oc_client_sale_credit_overrides (
 sale_id text PRIMARY KEY REFERENCES oc_client_sales(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),
 percent_maximum integer NOT NULL CHECK(percent_maximum>=0),
 tier_maximum integer NOT NULL CHECK(tier_maximum>0),
 applied_credit integer NOT NULL CHECK(applied_credit>percent_maximum AND applied_credit<=tier_maximum),
 actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION oc_client_immutable_sale_reference() RETURNS trigger
 LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Sale references and override history are immutable'; END; $$;
DROP TRIGGER IF EXISTS oc_client_immutable_control ON oc_client_sale_controls;
CREATE TRIGGER oc_client_immutable_control BEFORE UPDATE OR DELETE ON oc_client_sale_controls
 FOR EACH ROW EXECUTE FUNCTION oc_client_immutable_sale_reference();
DROP TRIGGER IF EXISTS oc_client_immutable_control_history ON oc_client_sale_control_changes;
CREATE TRIGGER oc_client_immutable_control_history BEFORE UPDATE OR DELETE ON oc_client_sale_control_changes
 FOR EACH ROW EXECUTE FUNCTION oc_client_immutable_sale_reference();
DROP TRIGGER IF EXISTS oc_client_immutable_credit_override ON oc_client_sale_credit_overrides;
CREATE TRIGGER oc_client_immutable_credit_override BEFORE UPDATE OR DELETE ON oc_client_sale_credit_overrides
 FOR EACH ROW EXECUTE FUNCTION oc_client_immutable_sale_reference();
COMMIT;
