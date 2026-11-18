BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_sale_controls (
 sale_id text PRIMARY KEY REFERENCES oc_client_sales(id),
 control_number text NOT NULL UNIQUE,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK(length(control_number) BETWEEN 1 AND 40 AND control_number ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$')
);
CREATE TABLE IF NOT EXISTS oc_client_sale_control_changes (
 id uuid PRIMARY KEY,
 sale_id text NOT NULL REFERENCES oc_client_sales(id),
 previous_number text,
 control_number text NOT NULL,
 actor text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_client_sale_control_changes_sale_idx
 ON oc_client_sale_control_changes(sale_id,changed_at DESC);
CREATE INDEX IF NOT EXISTS oc_client_sales_staff_history_idx
 ON oc_client_sales(created_by,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS oc_client_sales_history_idx
 ON oc_client_sales(created_at DESC,id DESC);
COMMIT;
