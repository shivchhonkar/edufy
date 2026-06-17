-- Add database constraints to prevent orphaned fee records and duplicate fee structures
-- This ensures data integrity at the database level

-- 1. Add NOT NULL constraint to fee_structure_id in student_fees table
-- This prevents orphaned fee records from being created
ALTER TABLE student_fees 
ALTER COLUMN fee_structure_id SET NOT NULL;

-- 2. Add unique constraint to prevent duplicate fee structures (per class)
-- Same fee type can exist for different classes; not twice for the same class/year/frequency
DROP INDEX IF EXISTS unique_active_fee_structure;
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_fee_structure_per_class
ON fee_structures (fee_type, COALESCE(class_id, 0), academic_year, frequency)
WHERE is_active = true;

-- 3. Add check constraint to ensure fee_structure_id is valid
-- This prevents invalid fee structure references
ALTER TABLE student_fees 
ADD CONSTRAINT fk_student_fees_fee_structure 
FOREIGN KEY (fee_structure_id) 
REFERENCES fee_structures(id) 
ON DELETE CASCADE;

-- 4. Add index for better performance on fee queries
CREATE INDEX IF NOT EXISTS idx_student_fees_student_academic_year 
ON student_fees (student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_student_fees_fee_structure_academic_year 
ON student_fees (fee_structure_id, academic_year);

-- 5. Add check constraint to ensure amount_due is not negative
ALTER TABLE student_fees 
ADD CONSTRAINT check_amount_due_not_negative 
CHECK (amount_due >= 0);

-- 6. Add check constraint to ensure amount_paid is not negative
ALTER TABLE student_fees 
ADD CONSTRAINT check_amount_paid_not_negative 
CHECK (amount_paid >= 0);

-- 7. Add check constraint to ensure amount_paid does not exceed amount_due
ALTER TABLE student_fees 
ADD CONSTRAINT check_amount_paid_not_exceed_due 
CHECK (amount_paid <= amount_due);

-- 8. Add unique constraint to prevent duplicate student fee records
-- This ensures a student can only have one fee record per fee structure per month per academic year
CREATE UNIQUE INDEX IF NOT EXISTS unique_student_fee_record 
ON student_fees (student_id, fee_structure_id, academic_year, month);

-- 9. Add trigger to automatically clean up orphaned records
-- This trigger will delete any student_fees records that reference deleted fee_structures
CREATE OR REPLACE FUNCTION cleanup_orphaned_student_fees()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete student_fees records that reference the deleted fee_structure
    DELETE FROM student_fees 
    WHERE fee_structure_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when fee_structures are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_orphaned_fees ON fee_structures;
CREATE TRIGGER trigger_cleanup_orphaned_fees
    AFTER DELETE ON fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_student_fees();

-- 10. Add trigger to prevent duplicate active fee structures
CREATE OR REPLACE FUNCTION prevent_duplicate_active_fee_structures()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an active fee structure, check for duplicates
    IF NEW.is_active = true THEN
        -- Check if there's already an active fee structure with the same type, amount, and academic year
        IF EXISTS (
            SELECT 1 FROM fee_structures 
            WHERE fee_type = NEW.fee_type 
            AND COALESCE(class_id, 0) = COALESCE(NEW.class_id, 0)
            AND academic_year = NEW.academic_year 
            AND frequency = NEW.frequency
            AND is_active = true 
            AND id != COALESCE(NEW.id, 0)
        ) THEN
            RAISE EXCEPTION 'Duplicate active fee structure: % already exists for this class and academic year %', 
                NEW.fee_type, NEW.academic_year;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when fee_structures are inserted or updated
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_fee_structures ON fee_structures;
CREATE TRIGGER trigger_prevent_duplicate_fee_structures
    BEFORE INSERT OR UPDATE ON fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_active_fee_structures();

-- 11. Add function to automatically sync transport fees
CREATE OR REPLACE FUNCTION auto_sync_transport_fees()
RETURNS TRIGGER AS $$
BEGIN
    -- If transport fee is updated, automatically sync with student_fees
    IF OLD.transport_fee != NEW.transport_fee THEN
        -- Update all pending transport fee records for this student
        UPDATE student_fees 
        SET amount_due = NEW.transport_fee,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = NEW.student_id
        AND fee_structure_id IN (
            SELECT id FROM fee_structures 
            WHERE fee_type ILIKE '%transport%' 
            AND academic_year = (
                SELECT academic_year FROM academic_years 
                WHERE is_active = true 
                ORDER BY id DESC LIMIT 1
            )
            AND is_active = true
        )
        AND status IN ('pending', 'partial');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when student_transport is updated
DROP TRIGGER IF EXISTS trigger_auto_sync_transport_fees ON student_transport;
CREATE TRIGGER trigger_auto_sync_transport_fees
    AFTER UPDATE ON student_transport
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_transport_fees();

-- 12. Add function to automatically clean up on fee structure deactivation
CREATE OR REPLACE FUNCTION cleanup_on_fee_structure_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- If fee structure is being deactivated, clean up related student_fees
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- Delete student_fees records for this deactivated fee structure
        DELETE FROM student_fees 
        WHERE fee_structure_id = NEW.id
        AND status IN ('pending', 'partial');
        
        -- Log the cleanup
        RAISE NOTICE 'Cleaned up student_fees records for deactivated fee structure: %', NEW.fee_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when fee_structures are updated
DROP TRIGGER IF EXISTS trigger_cleanup_on_deactivation ON fee_structures;
CREATE TRIGGER trigger_cleanup_on_deactivation
    AFTER UPDATE ON fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_on_fee_structure_deactivation();

-- 13. Add view for monitoring data integrity
CREATE OR REPLACE VIEW fee_data_integrity_check AS
SELECT 
    'Orphaned Fee Records' as issue_type,
    COUNT(*) as count,
    'student_fees with fee_structure_id IS NULL' as description
FROM student_fees 
WHERE fee_structure_id IS NULL

UNION ALL

SELECT 
    'Duplicate Active Fee Structures' as issue_type,
    COUNT(*) - COUNT(DISTINCT fee_type || '|' || amount || '|' || academic_year) as count,
    'Multiple active fee structures with same type, amount, and academic year' as description
FROM fee_structures 
WHERE is_active = true

UNION ALL

SELECT 
    'Negative Amount Due' as issue_type,
    COUNT(*) as count,
    'student_fees with negative amount_due' as description
FROM student_fees 
WHERE amount_due < 0

UNION ALL

SELECT 
    'Negative Amount Paid' as issue_type,
    COUNT(*) as count,
    'student_fees with negative amount_paid' as description
FROM student_fees 
WHERE amount_paid < 0

UNION ALL

SELECT 
    'Overpaid Amounts' as issue_type,
    COUNT(*) as count,
    'student_fees where amount_paid > amount_due' as description
FROM student_fees 
WHERE amount_paid > amount_due;

-- 14. Add function to run integrity check
CREATE OR REPLACE FUNCTION run_fee_integrity_check()
RETURNS TABLE(issue_type text, count bigint, description text) AS $$
BEGIN
    RETURN QUERY SELECT * FROM fee_data_integrity_check WHERE count > 0;
END;
$$ LANGUAGE plpgsql;

-- 15. Create a maintenance function to clean up all inconsistencies
CREATE OR REPLACE FUNCTION cleanup_fee_data_inconsistencies()
RETURNS TABLE(action text, records_affected bigint) AS $$
DECLARE
    deleted_count bigint;
BEGIN
    -- 1. Delete orphaned fee records
    DELETE FROM student_fees WHERE fee_structure_id IS NULL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'Deleted orphaned fee records'::text, deleted_count;
    
    -- 2. Fix negative amounts
    UPDATE student_fees SET amount_due = 0 WHERE amount_due < 0;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'Fixed negative amount_due'::text, deleted_count;
    
    UPDATE student_fees SET amount_paid = 0 WHERE amount_paid < 0;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'Fixed negative amount_paid'::text, deleted_count;
    
    -- 3. Fix overpaid amounts
    UPDATE student_fees SET amount_paid = amount_due WHERE amount_paid > amount_due;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'Fixed overpaid amounts'::text, deleted_count;
    
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION run_fee_integrity_check() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_fee_data_inconsistencies() TO PUBLIC;

