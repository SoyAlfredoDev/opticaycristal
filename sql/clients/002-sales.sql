BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_products (
 id text PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120),
 protected_cost integer NOT NULL CHECK(protected_cost > 0 AND protected_cost <= 1000000000),
 updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oc_client_sales (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES oc_client_user(id),
 request_key text NOT NULL UNIQUE, request_data jsonb NOT NULL,
 product_id text NOT NULL REFERENCES oc_client_products(id), product_name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 protected_cost integer NOT NULL CHECK(protected_cost > 0),
 total integer NOT NULL CHECK(total > 0), net integer NOT NULL CHECK(net > 0), vat integer NOT NULL CHECK(vat >= 0),
 deposit integer NOT NULL CHECK(deposit > 0), credit integer NOT NULL CHECK(credit >= 0),
 remaining integer NOT NULL CHECK(remaining >= 0 AND remaining <= credit),
 tier_code text NOT NULL, max_percent integer NOT NULL, max_amount integer NOT NULL,
 installment_count integer NOT NULL CHECK(installment_count BETWEEN 0 AND 2),
 identity_checked boolean NOT NULL, commitment_version text NOT NULL,
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(total = net + vat AND total = deposit + credit),
 CHECK((credit = 0 AND installment_count = 0) OR (credit > 0 AND installment_count > 0 AND identity_checked))
);
CREATE UNIQUE INDEX IF NOT EXISTS oc_client_one_active_credit ON oc_client_sales(user_id) WHERE remaining > 0;
CREATE INDEX IF NOT EXISTS oc_client_sales_user_idx ON oc_client_sales(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS oc_client_installments (
 id text PRIMARY KEY, sale_id text NOT NULL REFERENCES oc_client_sales(id),
 number integer NOT NULL CHECK(number BETWEEN 1 AND 2), due_date date NOT NULL,
 amount integer NOT NULL CHECK(amount > 0), paid integer NOT NULL DEFAULT 0 CHECK(paid >= 0 AND paid <= amount),
 UNIQUE(sale_id,number)
);
CREATE TABLE IF NOT EXISTS oc_client_payments (
 id text PRIMARY KEY, sale_id text NOT NULL REFERENCES oc_client_sales(id), request_key text NOT NULL UNIQUE,
 amount integer NOT NULL CHECK(amount > 0), paid_on date NOT NULL,
 reference text NOT NULL CHECK(length(reference) BETWEEN 1 AND 160),
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
