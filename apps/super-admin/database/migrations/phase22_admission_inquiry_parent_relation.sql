-- Phase 22: parent relation on admission inquiries

ALTER TABLE admission_inquiries
  ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(20) DEFAULT 'father'
  CHECK (parent_relation IN ('father', 'mother'));

UPDATE admission_inquiries
SET parent_relation = 'father'
WHERE parent_relation IS NULL;
