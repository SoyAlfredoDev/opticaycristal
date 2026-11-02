BEGIN;
SET LOCAL lock_timeout = '5s';
-- NULL means a product whose protected unit cost must be provided for each sale.
-- Existing fixed costs and historical sale costs remain unchanged.
ALTER TABLE oc_client_products ALTER COLUMN protected_cost DROP NOT NULL;
ALTER TABLE oc_client_product_changes ALTER COLUMN new_cost DROP NOT NULL;
COMMIT;
