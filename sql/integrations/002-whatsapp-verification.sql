BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_whatsapp_challenges (
 user_id text PRIMARY KEY REFERENCES oc_client_user(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, phone_hash text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 window_started_at timestamptz NOT NULL DEFAULT now(), issued_count integer NOT NULL DEFAULT 1,
 consumed_at timestamptz, cancelled_at timestamptz
);
CREATE TABLE IF NOT EXISTS oc_client_whatsapp_receipts (
 message_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION oc_reset_whatsapp_verification() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW."whatsappCipher" IS DISTINCT FROM OLD."whatsappCipher" THEN
  NEW."whatsappVerified"=false;
  UPDATE oc_client_whatsapp_challenges SET cancelled_at=now() WHERE user_id=OLD.id AND consumed_at IS NULL AND cancelled_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_reset_whatsapp_verification ON oc_client_user;
CREATE TRIGGER oc_reset_whatsapp_verification BEFORE UPDATE OF "whatsappCipher" ON oc_client_user FOR EACH ROW EXECUTE FUNCTION oc_reset_whatsapp_verification();
COMMIT;
