-- Audit event type for SUPER_ADMIN match editing (participants + schedule).

ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'MATCH_EDITED';
