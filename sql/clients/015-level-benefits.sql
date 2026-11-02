BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE oc_client_tiers ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
CREATE TABLE IF NOT EXISTS oc_client_level_changes (
  id uuid PRIMARY KEY,
  level_code text NOT NULL REFERENCES oc_client_tiers(code),
  level_name text NOT NULL,
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  actor text NOT NULL CHECK (length(btrim(actor)) > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 5 AND 500),
  revision integer NOT NULL CHECK (revision > 1),
  request_key uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (level_code, revision),
  CHECK (before_values <> after_values)
);
CREATE INDEX IF NOT EXISTS oc_client_level_changes_time_idx ON oc_client_level_changes(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS oc_client_level_changes_code_idx ON oc_client_level_changes(level_code, created_at DESC, id DESC);
CREATE OR REPLACE FUNCTION oc_preserve_level_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Level history is append-only';
END $$;
DROP TRIGGER IF EXISTS oc_preserve_level_history ON oc_client_level_changes;
CREATE TRIGGER oc_preserve_level_history BEFORE UPDATE OR DELETE OR TRUNCATE ON oc_client_level_changes
  FOR EACH STATEMENT EXECUTE FUNCTION oc_preserve_level_history();
COMMIT;
