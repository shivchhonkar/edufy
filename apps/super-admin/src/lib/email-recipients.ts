import type { RequestDb } from '@/lib/request-db';
import {
  isValidAudienceType,
  type SmsAudienceType,
} from '@/lib/sms-recipients';

export type EmailAudienceType = SmsAudienceType;

export interface EmailRecipient {
  email: string;
  name: string;
  student_id?: number;
  student_name?: string;
  source: 'guardian' | 'parent_email' | 'staff';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function addRecipient(
  map: Map<string, EmailRecipient>,
  email: string | null | undefined,
  recipient: Omit<EmailRecipient, 'email'>
) {
  if (!email || !isValidEmail(email)) return;
  const key = email.trim().toLowerCase();
  if (!map.has(key)) {
    map.set(key, { email: email.trim(), name: recipient.name, ...recipient });
  }
}

export async function resolveEmailRecipients(
  db: RequestDb,
  audienceType: EmailAudienceType,
  classId?: number | null,
  sectionId?: number | null
): Promise<EmailRecipient[]> {
  const map = new Map<string, EmailRecipient>();

  if (audienceType === 'all_staff') {
    const staffResult = await db.query<{
      email: string | null;
      first_name: string;
      last_name: string;
    }>(
      `SELECT email, first_name, last_name FROM staff
       WHERE status = 'active' AND email IS NOT NULL AND email <> ''`
    );
    staffResult.rows.forEach((row) => {
      addRecipient(map, row.email, {
        name: `${row.first_name} ${row.last_name}`.trim(),
        source: 'staff',
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  let studentQuery = `
    SELECT s.id, s.first_name, s.last_name, s.parent_email, s.parent_name
    FROM students s
    WHERE s.status = 'active'`;
  const params: number[] = [];

  if (audienceType === 'class_parents') {
    if (!classId) return [];
    params.push(classId);
    studentQuery += ` AND COALESCE(
      (SELECT e.class_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.class_id
    ) = $1`;
  } else if (audienceType === 'section_parents') {
    if (!classId || !sectionId) return [];
    params.push(classId, sectionId);
    studentQuery += ` AND COALESCE(
      (SELECT e.class_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.class_id
    ) = $1 AND COALESCE(
      (SELECT e.section_id FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true LIMIT 1),
      s.section_id
    ) = $2`;
  }

  const students = await db.query<{
    id: number;
    first_name: string;
    last_name: string;
    parent_email: string | null;
    parent_name: string | null;
  }>(studentQuery, params);

  for (const student of students.rows) {
    const studentName = `${student.first_name} ${student.last_name}`.trim();

    try {
      const guardians = await db.query<{
        name: string;
        email: string | null;
        is_primary_contact: boolean;
      }>(
        `SELECT name, email, is_primary_contact
         FROM student_guardians
         WHERE student_id = $1
         ORDER BY is_primary_contact DESC`,
        [student.id]
      );

      guardians.rows.forEach((g) => {
        addRecipient(map, g.email, {
          name: g.name,
          student_id: student.id,
          student_name: studentName,
          source: 'guardian',
        });
      });
    } catch {
      // student_guardians may not exist
    }

    addRecipient(map, student.parent_email, {
      name: student.parent_name || `Parent of ${studentName}`,
      student_id: student.id,
      student_name: studentName,
      source: 'parent_email',
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export { isValidAudienceType };
