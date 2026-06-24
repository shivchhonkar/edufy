/**
 * Shared SQL for excluding outstanding fees tied to inactive or missing fee structures.
 * Paid/completed rows remain visible for audit history.
 */
export const EXCLUDE_INACTIVE_OUTSTANDING_FEES = `AND NOT (
  sf.status IN ('pending', 'partial', 'overdue')
  AND GREATEST(sf.amount_due - sf.amount_paid, 0) > 0
  AND (fs.id IS NULL OR fs.is_active = false)
)`;
