BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE oc_client_tiers DROP CONSTRAINT IF EXISTS oc_client_tiers_max_installments_check;
ALTER TABLE oc_client_tiers ADD CONSTRAINT oc_client_tiers_max_installments_check CHECK(max_installments BETWEEN 1 AND 4);
ALTER TABLE oc_client_sales DROP CONSTRAINT IF EXISTS oc_client_sales_installment_count_check;
ALTER TABLE oc_client_sales ADD CONSTRAINT oc_client_sales_installment_count_check CHECK(installment_count BETWEEN 0 AND 4);
ALTER TABLE oc_client_installments DROP CONSTRAINT IF EXISTS oc_client_installments_number_check;
ALTER TABLE oc_client_installments ADD CONSTRAINT oc_client_installments_number_check CHECK(number BETWEEN 1 AND 4);
-- After migration 015, benefits are managed with revisions and an audit trail.
-- Re-running this old setup must not reset administrator-configured benefits.
UPDATE oc_client_tiers t SET max_installments=v.installments FROM (VALUES ('start',1),('vip',2),('premium',3),('elite',4)) AS v(code,installments) WHERE t.code=v.code AND t.max_installments IS DISTINCT FROM v.installments
 AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='oc_client_tiers' AND column_name='revision');
COMMIT;
