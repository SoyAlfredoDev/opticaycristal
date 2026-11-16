BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE oc_client_tiers IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE oc_client_tiers DROP CONSTRAINT IF EXISTS oc_client_tiers_code_check;
ALTER TABLE oc_client_tiers ADD CONSTRAINT oc_client_tiers_code_check
  CHECK (code IN ('start', 'star_plus', 'vip', 'premium', 'elite'));

DO $$
DECLARE
  start_position integer;
  tier record;
BEGIN
  IF EXISTS (SELECT 1 FROM oc_client_tiers WHERE code = 'star_plus') THEN
    RETURN;
  END IF;

  SELECT position INTO STRICT start_position FROM oc_client_tiers WHERE code = 'start';
  FOR tier IN
    SELECT code, position FROM oc_client_tiers WHERE position > start_position ORDER BY position DESC
  LOOP
    UPDATE oc_client_tiers SET position = tier.position + 1 WHERE code = tier.code;
  END LOOP;

  INSERT INTO oc_client_tiers (code, name, max_percent, max_amount, max_installments, position)
  VALUES ('star_plus', 'Star Plus', 30, 50000, 3, start_position + 1);
END $$;
COMMIT;
