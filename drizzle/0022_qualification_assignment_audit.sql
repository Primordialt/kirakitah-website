-- Audit event types for qualification auto-assign and position reassignment.

ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_AUTO_ASSIGN_COMPLETED';
ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'QUALIFICATION_POSITION_REASSIGNED';
