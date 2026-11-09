-- Audit records are evidence. They are append-only even for the application
-- role, so a bug or compromised query cannot rewrite firm history.

CREATE OR REPLACE FUNCTION veyra_reject_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER audit_events_no_mutation
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION veyra_reject_audit_mutation();
--> statement-breakpoint

CREATE TRIGGER audit_events_no_truncate
BEFORE TRUNCATE ON audit_events
FOR EACH STATEMENT EXECUTE FUNCTION veyra_reject_audit_mutation();
