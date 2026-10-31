BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_admin_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('ticket_created','customer_reply','mail_failed')),
 ticket_id uuid NOT NULL REFERENCES oc_client_support_tickets(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_client_admin_notifications_created_idx ON oc_client_admin_notifications(created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS oc_client_admin_notification_reads (
 notification_id uuid NOT NULL REFERENCES oc_client_admin_notifications(id) ON DELETE CASCADE,
 actor text NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(notification_id,actor)
);
CREATE INDEX IF NOT EXISTS oc_client_admin_notification_reads_actor_idx ON oc_client_admin_notification_reads(actor,notification_id);
CREATE OR REPLACE FUNCTION oc_client_notify_support_message() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.actor_kind='customer' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,ticket_id,created_at)
  VALUES('message:'||NEW.id,CASE WHEN EXISTS(SELECT 1 FROM oc_client_support_messages WHERE ticket_id=NEW.ticket_id AND id<>NEW.id) THEN 'customer_reply' ELSE 'ticket_created' END,NEW.ticket_id,NEW.created_at)
  ON CONFLICT(event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_notify_support_message ON oc_client_support_messages;
CREATE TRIGGER oc_client_notify_support_message AFTER INSERT ON oc_client_support_messages FOR EACH ROW EXECUTE FUNCTION oc_client_notify_support_message();
CREATE OR REPLACE FUNCTION oc_client_notify_failed_mail() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.state='failed' THEN
  INSERT INTO oc_client_admin_notifications(event_key,kind,ticket_id) VALUES('mail:'||NEW.id,'mail_failed',NEW.ticket_id) ON CONFLICT(event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_notify_failed_mail ON oc_client_support_mail;
CREATE TRIGGER oc_client_notify_failed_mail AFTER INSERT OR UPDATE OF state ON oc_client_support_mail FOR EACH ROW EXECUTE FUNCTION oc_client_notify_failed_mail();
-- Seed only the latest customer event of unresolved tickets, not every historical message.
INSERT INTO oc_client_admin_notifications(event_key,kind,ticket_id,created_at)
SELECT 'message:'||m.id,CASE WHEN EXISTS(SELECT 1 FROM oc_client_support_messages older WHERE older.ticket_id=m.ticket_id AND older.position<m.position) THEN 'customer_reply' ELSE 'ticket_created' END,m.ticket_id,m.created_at
FROM (SELECT DISTINCT ON (s.ticket_id) s.* FROM oc_client_support_messages s JOIN oc_client_support_tickets t ON t.id=s.ticket_id WHERE s.actor_kind='customer' AND t.status<>'resuelto' ORDER BY s.ticket_id,s.position DESC) m ON CONFLICT(event_key) DO NOTHING;
INSERT INTO oc_client_admin_notifications(event_key,kind,ticket_id,created_at) SELECT 'mail:'||id,'mail_failed',ticket_id,created_at FROM oc_client_support_mail WHERE state='failed' ON CONFLICT(event_key) DO NOTHING;
COMMIT;
