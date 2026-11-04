BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE oc_client_staff_invites DROP CONSTRAINT IF EXISTS oc_client_staff_invites_role_check;
ALTER TABLE oc_client_staff_invites ADD CONSTRAINT oc_client_staff_invites_role_check CHECK(role IN ('administrator','seller'));
ALTER TABLE oc_client_staff_user DROP CONSTRAINT IF EXISTS oc_client_staff_user_role_check;
ALTER TABLE oc_client_staff_user ADD CONSTRAINT oc_client_staff_user_role_check CHECK(role IN ('administrator','seller'));
CREATE OR REPLACE FUNCTION oc_staff_require_invitation() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE invitation oc_client_staff_invites%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('oc-staff-invitations'));
 SELECT * INTO invitation FROM oc_client_staff_invites WHERE id=NEW."invitationId" FOR UPDATE;
 IF NOT FOUND OR invitation.status<>'pending' OR invitation.expires_at<=now() OR invitation.email<>NEW.email OR invitation.rut_hash<>NEW."rutHash" OR invitation.rut_enc<>NEW."rutCipher" OR NEW.role<>invitation.role OR NEW.status<>'active' OR NEW."emailVerified" IS NOT TRUE THEN RAISE EXCEPTION 'Staff registration requires a valid pending invitation'; END IF;
 UPDATE oc_client_staff_invites SET status='accepted',accepted_at=now(),accepted_user_id=NEW.id WHERE id=invitation.id;
 INSERT INTO oc_client_staff_events(actor,kind,entity_id) VALUES(NEW.id,'invitation_accepted',invitation.id);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_staff_require_invitation ON oc_client_staff_user;
CREATE TRIGGER oc_staff_require_invitation BEFORE INSERT ON oc_client_staff_user FOR EACH ROW EXECUTE FUNCTION oc_staff_require_invitation();
CREATE OR REPLACE FUNCTION oc_staff_session_active() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 PERFORM 1 FROM oc_client_staff_user WHERE id=NEW."userId" AND status='active' AND role IN ('administrator','seller') AND "emailVerified"=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staff access is suspended or unavailable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS oc_staff_session_active ON oc_client_staff_session;
CREATE TRIGGER oc_staff_session_active BEFORE INSERT ON oc_client_staff_session FOR EACH ROW EXECUTE FUNCTION oc_staff_session_active();
COMMIT;
