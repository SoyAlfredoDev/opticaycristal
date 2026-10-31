BEGIN;
-- Stable cursor pagination, including sales created in the same microsecond.
CREATE INDEX IF NOT EXISTS oc_client_sales_customer_page_idx
  ON oc_client_sales(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS oc_client_payments_sale_page_idx
  ON oc_client_payments(sale_id,created_at DESC,id DESC);
COMMIT;
