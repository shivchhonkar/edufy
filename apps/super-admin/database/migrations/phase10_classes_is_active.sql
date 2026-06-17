-- Phase 10: Add is_active flag to classes for enable/disable management
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes (is_active);
