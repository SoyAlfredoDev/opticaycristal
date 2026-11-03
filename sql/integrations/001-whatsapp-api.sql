BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_integration_limits (
 key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS oc_client_integration_limits_expiry ON oc_client_integration_limits(reset_at);
CREATE TABLE IF NOT EXISTS oc_client_integration_events (
 id uuid PRIMARY KEY, key_id text NOT NULL, action text NOT NULL, outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_client_integration_events_created ON oc_client_integration_events(created_at);
COMMIT;
