BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_admin_login_limits (
 key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS oc_client_product_changes (
 id text PRIMARY KEY, product_id text NOT NULL REFERENCES oc_client_products(id),
 old_name text, old_cost integer, new_name text NOT NULL, new_cost integer NOT NULL,
 actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oc_client_operations (
 request_key text PRIMARY KEY, actor text NOT NULL, kind text NOT NULL CHECK(kind IN ('create','payment')),
 payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled'));
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE oc_client_sales ADD COLUMN IF NOT EXISTS signed_by text;
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS reversed_by text;
ALTER TABLE oc_client_payments ADD COLUMN IF NOT EXISTS reverse_reason text;
COMMIT;
