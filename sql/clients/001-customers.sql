BEGIN;
CREATE TABLE IF NOT EXISTS oc_client_tiers (
  code text PRIMARY KEY CHECK(code IN ('start','vip','premium','elite')),
  name text NOT NULL, max_percent integer NOT NULL CHECK(max_percent BETWEEN 1 AND 100),
  max_amount integer NOT NULL CHECK(max_amount > 0), max_installments integer NOT NULL CHECK(max_installments BETWEEN 1 AND 2), position integer NOT NULL UNIQUE
);
INSERT INTO oc_client_tiers(code,name,max_percent,max_amount,max_installments,position) VALUES
 ('start','Start',30,40000,1,1),('vip','VIP',40,60000,1,2),('premium','Premium',60,80000,2,3),('elite','Elite',70,150000,2,4)
 ON CONFLICT(code) DO NOTHING;
CREATE TABLE IF NOT EXISTS oc_client_user (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "firstName" text NOT NULL, "lastName" text NOT NULL,
 "rutCipher" text NOT NULL, "rutHash" text NOT NULL UNIQUE, "whatsappCipher" text NOT NULL,
 category text NOT NULL DEFAULT 'start' REFERENCES oc_client_tiers(code),
 "identityVerified" boolean NOT NULL DEFAULT false, "whatsappVerified" boolean NOT NULL DEFAULT false,
 "privacyVersion" text NOT NULL DEFAULT '2026-10-28'
);
CREATE TABLE IF NOT EXISTS oc_client_session (
 id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS oc_client_session_user_idx ON oc_client_session("userId");
CREATE TABLE IF NOT EXISTS oc_client_account (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES oc_client_user(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
 scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("providerId", "accountId")
);
CREATE INDEX IF NOT EXISTS oc_client_account_user_idx ON oc_client_account("userId");
CREATE TABLE IF NOT EXISTS oc_client_verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_client_verification_identifier_idx ON oc_client_verification(identifier);
CREATE TABLE IF NOT EXISTS oc_client_auth_rate_limit (id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, "lastRequest" bigint NOT NULL);
CREATE TABLE IF NOT EXISTS oc_client_registration_limit (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS oc_client_credit_balances (
 user_id text PRIMARY KEY REFERENCES oc_client_user(id) ON DELETE CASCADE,
 principal_outstanding integer NOT NULL DEFAULT 0 CHECK(principal_outstanding >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION oc_initialize_customer_credit() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  INSERT INTO oc_client_credit_balances(user_id) VALUES(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_client_credit_after_insert ON oc_client_user;
CREATE TRIGGER oc_client_credit_after_insert AFTER INSERT ON oc_client_user FOR EACH ROW EXECUTE FUNCTION oc_initialize_customer_credit();
CREATE INDEX IF NOT EXISTS oc_client_user_created_idx ON oc_client_user("createdAt" DESC, id DESC);
COMMIT;
