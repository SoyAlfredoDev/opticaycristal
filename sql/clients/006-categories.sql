BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_category_changes (
 id uuid PRIMARY KEY,
 customer_id text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
 old_category text NOT NULL REFERENCES oc_client_tiers(code),
 new_category text NOT NULL REFERENCES oc_client_tiers(code),
 actor text NOT NULL,
 request_key uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(old_category<>new_category)
);
CREATE INDEX IF NOT EXISTS oc_client_category_history_idx ON oc_client_category_changes(customer_id,created_at DESC);
COMMIT;
