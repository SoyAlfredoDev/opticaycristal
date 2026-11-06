BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_whatsapp_otps (
 user_id text PRIMARY KEY REFERENCES oc_client_user(id) ON DELETE CASCADE,
 request_id uuid NOT NULL UNIQUE,
 phone_hash text NOT NULL,
 code_hash text,
 state text NOT NULL CHECK(state IN ('sending','sent','failed','uncertain')),
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 resend_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 consumed_at timestamptz, cancelled_at timestamptz,
 provider_id text
);
CREATE OR REPLACE FUNCTION oc_reset_whatsapp_verification() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW."whatsappCipher" IS DISTINCT FROM OLD."whatsappCipher" THEN
  NEW."whatsappVerified"=false;
  UPDATE oc_client_whatsapp_challenges SET cancelled_at=now() WHERE user_id=OLD.id AND consumed_at IS NULL AND cancelled_at IS NULL;
  UPDATE oc_client_whatsapp_otps SET cancelled_at=now(),code_hash=NULL WHERE user_id=OLD.id AND consumed_at IS NULL AND cancelled_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
COMMIT;
