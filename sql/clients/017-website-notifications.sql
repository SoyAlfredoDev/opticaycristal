BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION oc_client_notify_website_event() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_TABLE_NAME='website_orders' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,entity_id,reference,created_at)
   VALUES('order:'||NEW.id,'order_received',NEW.id,'PED-'||left(NEW.id,8),NEW.created_at) ON CONFLICT(event_key) DO NOTHING;
 ELSIF TG_TABLE_NAME='website_requests' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,entity_id,reference,created_at)
   VALUES('request:'||NEW.id,'request_received',NEW.id,CASE WHEN NEW.payload->>'origen'='convenio' THEN 'CON-' ELSE 'JOR-' END||left(NEW.id,8),NEW.created_at) ON CONFLICT(event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE website_schema text := current_setting('oc.website_schema',true); target_schema text := current_schema();
BEGIN
 IF website_schema IS NULL OR website_schema !~ '^[a-z][a-z0-9_]{0,62}$' THEN RAISE EXCEPTION 'Explicit website schema required'; END IF;
 IF to_regclass(format('%I.website_orders',website_schema)) IS NULL OR to_regclass(format('%I.website_requests',website_schema)) IS NULL THEN RAISE EXCEPTION 'Website tables must exist in the selected database and schema'; END IF;
 EXECUTE format('DROP TRIGGER IF EXISTS oc_notify_order ON %I.website_orders',website_schema);
 EXECUTE format('CREATE TRIGGER oc_notify_order AFTER INSERT ON %I.website_orders FOR EACH ROW EXECUTE FUNCTION %I.oc_client_notify_website_event()',website_schema,target_schema);
 EXECUTE format('DROP TRIGGER IF EXISTS oc_notify_request ON %I.website_requests',website_schema);
 EXECUTE format('CREATE TRIGGER oc_notify_request AFTER INSERT ON %I.website_requests FOR EACH ROW EXECUTE FUNCTION %I.oc_client_notify_website_event()',website_schema,target_schema);
END $$;
COMMIT;
