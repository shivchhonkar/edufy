/**
 * Shared SQL fragments for enrollment-centric reads.
 * Prefer enrollment placement over denormalized students.class_id / section_id.
 */

/** LEFT JOIN current enrollment for a student row alias `s`. */
export const JOIN_CURRENT_ENROLLMENT_ON_STUDENT = `
  LEFT JOIN LATERAL (
    SELECT e.id AS enrollment_id, e.academic_year_id, e.academic_year,
           e.class_id, e.section_id, e.roll_number, e.house_id, e.stream_id, e.status
    FROM student_enrollments e
    WHERE e.student_id = s.id AND e.is_current = true
    ORDER BY e.id DESC
    LIMIT 1
  ) ce ON true
`;

/** Coalesced placement columns (enrollment wins). */
export const STUDENT_PLACEMENT_SELECT = `
  COALESCE(ce.class_id, s.class_id) AS class_id,
  COALESCE(ce.section_id, s.section_id) AS section_id,
  COALESCE(ce.roll_number, s.roll_number) AS roll_number,
  ce.enrollment_id,
  ce.academic_year_id,
  ce.academic_year AS enrollment_academic_year
`;

/** Join enrollment on attendance row when enrollment_id is set. */
export const JOIN_ATTENDANCE_ENROLLMENT = `
  LEFT JOIN student_enrollments ae ON ae.id = a.enrollment_id
`;

export const ATTENDANCE_PLACEMENT_SELECT = `
  COALESCE(ae.class_id, ce.class_id, s.class_id) AS class_id,
  COALESCE(ae.section_id, ce.section_id, s.section_id) AS section_id,
  COALESCE(ae.roll_number, ce.roll_number, s.roll_number) AS roll_number,
  COALESCE(ae.academic_year, ce.academic_year) AS academic_year,
  a.enrollment_id
`;
