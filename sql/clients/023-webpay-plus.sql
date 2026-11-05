BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_webpay (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES oc_client_user(id),
 kind text NOT NULL CHECK(kind IN ('catalog','credit')),
 sale_id text REFERENCES oc_client_sales(id),
 description text NOT NULL CHECK(length(description) BETWEEN 1 AND 160),
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 1000000000),
 principal integer NOT NULL DEFAULT 0 CHECK(principal>=0),
 interest integer NOT NULL DEFAULT 0 CHECK(interest>=0),
 request_key uuid NOT NULL,
 buy_order varchar(26) NOT NULL UNIQUE,
 session_id varchar(61) NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'quoted' CHECK(state IN ('quoted','creating','ready','confirming','unknown','paid','rejected','cancelled','review')),
 token_hash text UNIQUE,
 token_enc text,
 payment_id text REFERENCES oc_client_payments(id),
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 authorized_at timestamptz,
 UNIQUE(user_id,request_key),
 CHECK((kind='catalog' AND sale_id IS NULL AND principal=0 AND interest=0) OR (kind='credit' AND sale_id IS NOT NULL AND principal+interest=amount))
);
CREATE UNIQUE INDEX IF NOT EXISTS oc_client_webpay_one_credit_pending ON oc_client_webpay(sale_id) WHERE kind='credit' AND state IN ('quoted','creating','ready','confirming','unknown','review');
CREATE INDEX IF NOT EXISTS oc_client_webpay_customer ON oc_client_webpay(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS oc_client_webpay_events (
 id uuid PRIMARY KEY,
 payment_request_id uuid NOT NULL REFERENCES oc_client_webpay(id),
 outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
