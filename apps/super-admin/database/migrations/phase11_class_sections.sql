-- Phase 11: Allow sections to be assigned to multiple classes via junction table

CREATE TABLE IF NOT EXISTS class_sections (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_class_sections_class ON class_sections (class_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_section ON class_sections (section_id);

-- Backfill assignments from legacy sections.class_id
INSERT INTO class_sections (class_id, section_id)
SELECT s.class_id, s.id
FROM sections s
WHERE s.class_id IS NOT NULL
ON CONFLICT (class_id, section_id) DO NOTHING;

ALTER TABLE sections ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Sections become master records; class link is via class_sections
ALTER TABLE sections ALTER COLUMN class_id DROP NOT NULL;
