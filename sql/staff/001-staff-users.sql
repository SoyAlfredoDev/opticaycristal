BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS oc_client_staff_invites (
 id text PRIMARY KEY, email text NOT NULL CHECK(email=lower(email)), rut_enc text NOT NULL, rut_hash text NOT NULL,
 role text NOT NULL DEFAULT 'administrator' CHECK(role='administrator'), token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','cancelled')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours', created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL,
 accepted_at timestamptz, accepted_user_id text, cancelled_at timestamptz, cancelled_by text,
 mail_status text NOT NULL DEFAULT 'pending' CHECK(mail_status IN ('pending','accepted','failed')),
 mail_id text, mail_error text, mail_updated_at timestamptz,
 CHECK((status='accepted')=(accepted_user_id IS NOT NULL)), CHECK((status='accepted')=(accepted_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS oc_staff_pending_email_idx ON oc_client_staff_invites(email) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS oc_staff_pending_rut_idx ON oc_client_staff_invites(rut_hash) WHERE status='pending';
CREATE INDEX IF NOT EXISTS oc_staff_invite_created_idx ON oc_client_staff_invites(created_at DESC);
CREATE TABLE IF NOT EXISTS oc_client_staff_user (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE CHECK(email=lower(email)), "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "rutCipher" text NOT NULL, "rutHash" text NOT NULL UNIQUE, "invitationId" text NOT NULL UNIQUE REFERENCES oc_client_staff_invites(id),
 role text NOT NULL DEFAULT 'administrator' CHECK(role='administrator'), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended'))
);
CREATE TABLE IF NOT EXISTS oc_client_staff_session (
 id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text,
 "userId" text NOT NULL REFERENCES oc_client_staff_user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS oc_staff_session_user_idx ON oc_client_staff_session("userId");
CREATE TABLE IF NOT EXISTS oc_client_staff_account (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES oc_client_staff_user(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
 scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), UNIQUE("providerId","accountId")
);
CREATE TABLE IF NOT EXISTS oc_client_staff_verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oc_staff_verification_identifier_idx ON oc_client_staff_verification(identifier);
CREATE TABLE IF NOT EXISTS oc_client_staff_rate_limit (id text PRIMARY KEY,key text NOT NULL UNIQUE,count integer NOT NULL,"lastRequest" bigint NOT NULL);
CREATE TABLE IF NOT EXISTS oc_client_staff_request_limit (key text PRIMARY KEY,count integer NOT NULL,reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS oc_client_staff_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, kind text NOT NULL, entity_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION oc_staff_require_invitation() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE invitation oc_client_staff_invites%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('oc-staff-invitations'));
 SELECT * INTO invitation FROM oc_client_staff_invites WHERE id=NEW."invitationId" FOR UPDATE;
 IF NOT FOUND OR invitation.status<>'pending' OR invitation.expires_at<=now() OR invitation.email<>NEW.email OR invitation.rut_hash<>NEW."rutHash" OR invitation.rut_enc<>NEW."rutCipher" OR NEW.role<>'administrator' OR NEW.status<>'active' OR NEW."emailVerified" IS NOT TRUE THEN RAISE EXCEPTION 'Staff registration requires a valid pending invitation'; END IF;
 UPDATE oc_client_staff_invites SET status='accepted',accepted_at=now(),accepted_user_id=NEW.id WHERE id=invitation.id;
 INSERT INTO oc_client_staff_events(actor,kind,entity_id) VALUES(NEW.id,'invitation_accepted',invitation.id);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_staff_require_invitation ON oc_client_staff_user;
CREATE TRIGGER oc_staff_require_invitation BEFORE INSERT ON oc_client_staff_user FOR EACH ROW EXECUTE FUNCTION oc_staff_require_invitation();
CREATE OR REPLACE FUNCTION oc_staff_session_active() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 PERFORM 1 FROM oc_client_staff_user WHERE id=NEW."userId" AND status='active' AND role='administrator' AND "emailVerified"=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staff access is suspended or unavailable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_staff_session_active ON oc_client_staff_session;
CREATE TRIGGER oc_staff_session_active BEFORE INSERT ON oc_client_staff_session FOR EACH ROW EXECUTE FUNCTION oc_staff_session_active();
COMMIT;
