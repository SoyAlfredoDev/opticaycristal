BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE oc_client_admin_notifications DROP CONSTRAINT IF EXISTS oc_client_admin_notifications_kind_check;
ALTER TABLE oc_client_admin_notifications ALTER COLUMN ticket_id DROP NOT NULL;
ALTER TABLE oc_client_admin_notifications ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE oc_client_admin_notifications ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE oc_client_admin_notifications ADD COLUMN IF NOT EXISTS sale_id text;
ALTER TABLE oc_client_admin_notifications ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE oc_client_admin_notifications ADD CONSTRAINT oc_client_admin_notifications_kind_check CHECK(kind IN ('ticket_created','customer_reply','mail_failed','customer_registered','sale_created','payment_received','order_received','request_received'));
ALTER TABLE oc_client_admin_notifications DROP CONSTRAINT IF EXISTS oc_client_admin_notifications_source_check;
ALTER TABLE oc_client_admin_notifications ADD CONSTRAINT oc_client_admin_notifications_source_check CHECK(
 (kind IN ('ticket_created','customer_reply','mail_failed') AND ticket_id IS NOT NULL) OR
 (kind IN ('customer_registered','sale_created','payment_received','order_received','request_received') AND entity_id IS NOT NULL)
);
CREATE OR REPLACE FUNCTION oc_client_notify_business_event() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_TABLE_NAME='oc_client_user' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,entity_id,customer_id,reference,created_at)
   VALUES('customer:'||NEW.id,'customer_registered',NEW.id,NEW.id,'CLI-'||left(NEW.id,8),NEW."createdAt") ON CONFLICT(event_key) DO NOTHING;
 ELSIF TG_TABLE_NAME='oc_client_sales' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,entity_id,customer_id,sale_id,reference,created_at)
   VALUES('sale:'||NEW.id,'sale_created',NEW.id,NEW.user_id,NEW.id,'VEN-'||left(NEW.id,8),NEW.created_at) ON CONFLICT(event_key) DO NOTHING;
 ELSIF TG_TABLE_NAME='oc_client_payments' THEN
  -- A waiver alone is not money received. Never label it as a payment.
  IF NEW.reversed_at IS NULL AND NEW.amount+NEW.interest_amount>0 THEN
   INSERT INTO oc_client_admin_notifications(event_key,kind,entity_id,customer_id,sale_id,reference,created_at)
    SELECT 'payment:'||NEW.id,'payment_received',NEW.id,s.user_id,NEW.sale_id,'PAG-'||left(NEW.id,8),NEW.created_at FROM oc_client_sales s WHERE s.id=NEW.sale_id ON CONFLICT(event_key) DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_notify_registration ON oc_client_user;
CREATE TRIGGER oc_client_notify_registration AFTER INSERT ON oc_client_user FOR EACH ROW EXECUTE FUNCTION oc_client_notify_business_event();
DROP TRIGGER IF EXISTS oc_client_notify_sale ON oc_client_sales;
CREATE TRIGGER oc_client_notify_sale AFTER INSERT ON oc_client_sales FOR EACH ROW EXECUTE FUNCTION oc_client_notify_business_event();
DROP TRIGGER IF EXISTS oc_client_notify_payment ON oc_client_payments;
CREATE TRIGGER oc_client_notify_payment AFTER INSERT ON oc_client_payments FOR EACH ROW EXECUTE FUNCTION oc_client_notify_business_event();
-- No backfill: old accounts and purchases are not new events.
COMMIT;
