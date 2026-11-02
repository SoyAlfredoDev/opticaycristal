BEGIN;
SET LOCAL lock_timeout = '5s';
-- Category-only sales do not collect a protected cost. NULL means not used,
-- never a fictitious zero cost. Existing sales and product costs stay intact.
ALTER TABLE oc_client_sales ALTER COLUMN protected_cost DROP NOT NULL;
COMMIT;
