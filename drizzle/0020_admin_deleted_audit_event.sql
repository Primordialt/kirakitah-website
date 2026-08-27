-- Add ADMIN_DELETED to admin audit event type enum.
-- Soft-delete of administrators is audited with this event.

ALTER TYPE "admin_audit_event_type" ADD VALUE IF NOT EXISTS 'ADMIN_DELETED';
