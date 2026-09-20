import type { RequestDb } from '@/lib/request-db';
import type {
  AlumniDirectoryItem,
  AlumniEmployment,
  AlumniEvent,
  AlumniHigherEducation,
  AlumniProfile,
  AlumniSuccessStory,
} from '@/lib/alumni-utils';
import { ALUMNI_EXIT_REASON_CODE, getHighestClass, HIGHEST_CLASS_CTE, LATEST_ENROLLMENT_LATERAL, ALUMNI_HIGHEST_CLASS_MATCH, isStudentAlumniEligible } from '@/lib/alumni-eligibility';
import { studentFullName } from '@/features/students/utils/student-profile';

async function resolveAcademicYear(db: RequestDb): Promise<string> {
  const result = await db.query<{ academic_year: string }>(
    `SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1`
  );
  return result.rows[0]?.academic_year || new Date().getFullYear().toString();
}

export async function syncAlumniProfiles(db: RequestDb): Promise<number> {
  const academicYear = await resolveAcademicYear(db);
  const highest = await getHighestClass(db);
  if (!highest) return 0;

  const result = await db.query<{ count: string }>(
    `WITH ${HIGHEST_CLASS_CTE},
     candidates AS (
       SELECT DISTINCT ON (s.id)
         s.id AS student_id,
         COALESCE(se.exit_date, s.updated_at::date) AS exit_date,
         se.exit_reason_label AS exit_reason,
         COALESCE(se.student_snapshot->>'class_name', en.class_name) AS last_class,
         COALESCE(se.student_snapshot->>'section_name', en.section_name) AS last_section,
         COALESCE(se.student_snapshot->>'academic_year', en.academic_year, $1) AS batch_year,
         s.parent_email AS current_email,
         COALESCE(s.parent_phone, s.emergency_contact) AS current_phone,
         s.address AS current_address,
         s.city AS current_city
       FROM students s
       INNER JOIN student_exits se ON se.student_id = s.id
         AND se.status = 'EXITED'
         AND se.exit_reason_code = $2
       CROSS JOIN highest_class hc
       ${LATEST_ENROLLMENT_LATERAL}
       WHERE s.status = 'graduated'
         AND ${ALUMNI_HIGHEST_CLASS_MATCH}
         AND NOT EXISTS (SELECT 1 FROM alumni_profiles ap WHERE ap.student_id = s.id)
       ORDER BY s.id, se.completed_at DESC NULLS LAST
     )
     INSERT INTO alumni_profiles (
       student_id, batch_year, last_class, last_section, exit_date, exit_reason,
       current_email, current_phone, current_address, current_city
     )
     SELECT
       student_id, batch_year, last_class, last_section, exit_date, exit_reason,
       current_email, current_phone, current_address, current_city
     FROM candidates
     RETURNING id`,
    [academicYear, ALUMNI_EXIT_REASON_CODE]
  );

  return result.rowCount ?? 0;
}

export async function syncAlumniProfileForStudent(
  db: RequestDb,
  studentId: number
): Promise<number | null> {
  const eligible = await isStudentAlumniEligible(db, studentId);
  if (!eligible) return null;

  const existing = await db.query<{ id: number }>(
    `SELECT id FROM alumni_profiles WHERE student_id = $1`,
    [studentId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  await syncAlumniProfiles(db);
  const afterSync = await db.query<{ id: number }>(
    `SELECT id FROM alumni_profiles WHERE student_id = $1`,
    [studentId]
  );
  return afterSync.rows[0]?.id ?? null;
}

export async function listAlumniDirectory(
  db: RequestDb,
  options: { search?: string; batchYear?: string; page: number; limit: number }
): Promise<{ items: AlumniDirectoryItem[]; total: number; highest_class?: string | null }> {
  await syncAlumniProfiles(db);
  const highest = await getHighestClass(db);

  const conditions: string[] = [ALUMNI_HIGHEST_CLASS_MATCH];
  const params: unknown[] = [ALUMNI_EXIT_REASON_CODE];
  let paramIndex = 2;

  if (options.search) {
    conditions.push(`(
      s.first_name ILIKE $${paramIndex}
      OR s.last_name ILIKE $${paramIndex}
      OR s.admission_number ILIKE $${paramIndex}
      OR ap.current_email ILIKE $${paramIndex}
      OR ap.current_phone ILIKE $${paramIndex}
      OR ap.last_class ILIKE $${paramIndex}
    )`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.batchYear) {
    conditions.push(`ap.batch_year = $${paramIndex}`);
    params.push(options.batchYear);
    paramIndex += 1;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const offset = (options.page - 1) * options.limit;

  const fromClause = `
    FROM alumni_profiles ap
    INNER JOIN students s ON s.id = ap.student_id
    INNER JOIN student_exits se ON se.student_id = s.id
      AND se.status = 'EXITED'
      AND se.exit_reason_code = $1
    CROSS JOIN highest_class hc
    ${LATEST_ENROLLMENT_LATERAL}
  `;

  const countResult = await db.query<{ count: string }>(
    `WITH ${HIGHEST_CLASS_CTE}
     SELECT COUNT(*)::text AS count
     ${fromClause}
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `WITH ${HIGHEST_CLASS_CTE}
     SELECT ap.*,
            s.first_name, s.middle_name, s.last_name, s.admission_number, s.photo_url, s.status AS student_status, s.gender
     ${fromClause}
     ${whereClause}
     ORDER BY ap.exit_date DESC NULLS LAST, s.first_name ASC, s.last_name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  const items: AlumniDirectoryItem[] = listResult.rows.map((row) => ({
    ...(row as AlumniProfile),
    full_name: studentFullName(row as { first_name: string; middle_name?: string; last_name?: string }),
  }));

  return { items, total, highest_class: highest?.name ?? null };
}

export async function getAlumniProfile(db: RequestDb, id: number): Promise<AlumniDirectoryItem | null> {
  const result = await db.query(
    `SELECT ap.*,
            s.first_name, s.middle_name, s.last_name, s.admission_number, s.photo_url, s.status AS student_status, s.gender
     FROM alumni_profiles ap
     INNER JOIN students s ON s.id = ap.student_id
     WHERE ap.id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...(row as AlumniProfile),
    full_name: studentFullName(row as { first_name: string; middle_name?: string; last_name?: string }),
  };
}

export async function getAlumniProfileByStudentId(
  db: RequestDb,
  studentId: number
): Promise<AlumniDirectoryItem | null> {
  const result = await db.query(
    `SELECT ap.*,
            s.first_name, s.middle_name, s.last_name, s.admission_number, s.photo_url, s.status AS student_status, s.gender
     FROM alumni_profiles ap
     INNER JOIN students s ON s.id = ap.student_id
     WHERE ap.student_id = $1`,
    [studentId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...(row as AlumniProfile),
    full_name: studentFullName(row as { first_name: string; middle_name?: string; last_name?: string }),
  };
}

export async function updateAlumniProfile(
  db: RequestDb,
  id: number,
  data: Partial<AlumniProfile>
): Promise<AlumniDirectoryItem | null> {
  const result = await db.query(
    `UPDATE alumni_profiles SET
       batch_year = COALESCE($2, batch_year),
       last_class = COALESCE($3, last_class),
       last_section = COALESCE($4, last_section),
       exit_date = COALESCE($5, exit_date),
       exit_reason = COALESCE($6, exit_reason),
       current_email = COALESCE($7, current_email),
       current_phone = COALESCE($8, current_phone),
       current_address = COALESCE($9, current_address),
       current_city = COALESCE($10, current_city),
       linkedin_url = COALESCE($11, linkedin_url),
       is_public = COALESCE($12, is_public),
       notes = COALESCE($13, notes),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.batch_year ?? null,
      data.last_class ?? null,
      data.last_section ?? null,
      data.exit_date ?? null,
      data.exit_reason ?? null,
      data.current_email ?? null,
      data.current_phone ?? null,
      data.current_address ?? null,
      data.current_city ?? null,
      data.linkedin_url ?? null,
      data.is_public ?? null,
      data.notes ?? null,
    ]
  );
  if (result.rows.length === 0) return null;
  return getAlumniProfile(db, id);
}

export async function ensureAlumniProfileForStudent(
  db: RequestDb,
  studentId: number
): Promise<number> {
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM alumni_profiles WHERE student_id = $1`,
    [studentId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const profileId = await syncAlumniProfileForStudent(db, studentId);
  if (profileId) return profileId;

  throw new Error(
    'Student is not eligible for alumni. Only highest-class students who exited with "Passed Final Class" qualify.'
  );
}

export async function listHigherEducation(
  db: RequestDb,
  options: { search?: string; studentId?: number; page: number; limit: number }
): Promise<{ items: AlumniHigherEducation[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.search) {
    conditions.push(`(
      he.institution_name ILIKE $${paramIndex}
      OR he.degree ILIKE $${paramIndex}
      OR s.first_name ILIKE $${paramIndex}
      OR s.last_name ILIKE $${paramIndex}
    )`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.studentId) {
    conditions.push(`he.student_id = $${paramIndex}`);
    params.push(options.studentId);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.limit;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM alumni_higher_education he
     INNER JOIN students s ON s.id = he.student_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `SELECT he.*,
            TRIM(CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name)) AS alumni_name,
            s.admission_number
     FROM alumni_higher_education he
     INNER JOIN students s ON s.id = he.student_id
     ${whereClause}
     ORDER BY he.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  return { items: listResult.rows as AlumniHigherEducation[], total };
}

export async function createHigherEducation(
  db: RequestDb,
  data: Omit<AlumniHigherEducation, 'id' | 'created_at' | 'alumni_name' | 'admission_number'>
): Promise<AlumniHigherEducation> {
  const alumniId = await ensureAlumniProfileForStudent(db, data.student_id);
  const result = await db.query(
    `INSERT INTO alumni_higher_education (
      alumni_id, student_id, institution_name, degree, field_of_study,
      start_year, end_year, status, country, city, remarks
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      alumniId,
      data.student_id,
      data.institution_name,
      data.degree ?? null,
      data.field_of_study ?? null,
      data.start_year ?? null,
      data.end_year ?? null,
      data.status || 'studying',
      data.country ?? null,
      data.city ?? null,
      data.remarks ?? null,
    ]
  );
  return result.rows[0] as AlumniHigherEducation;
}

export async function updateHigherEducation(
  db: RequestDb,
  id: number,
  data: Partial<AlumniHigherEducation>
): Promise<AlumniHigherEducation | null> {
  const result = await db.query(
    `UPDATE alumni_higher_education SET
       institution_name = COALESCE($2, institution_name),
       degree = COALESCE($3, degree),
       field_of_study = COALESCE($4, field_of_study),
       start_year = COALESCE($5, start_year),
       end_year = COALESCE($6, end_year),
       status = COALESCE($7, status),
       country = COALESCE($8, country),
       city = COALESCE($9, city),
       remarks = COALESCE($10, remarks),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.institution_name ?? null,
      data.degree ?? null,
      data.field_of_study ?? null,
      data.start_year ?? null,
      data.end_year ?? null,
      data.status ?? null,
      data.country ?? null,
      data.city ?? null,
      data.remarks ?? null,
    ]
  );
  return (result.rows[0] as AlumniHigherEducation) ?? null;
}

export async function deleteHigherEducation(db: RequestDb, id: number): Promise<boolean> {
  const result = await db.query(`DELETE FROM alumni_higher_education WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listEmployment(
  db: RequestDb,
  options: { search?: string; studentId?: number; page: number; limit: number }
): Promise<{ items: AlumniEmployment[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.search) {
    conditions.push(`(
      e.company_name ILIKE $${paramIndex}
      OR e.job_title ILIKE $${paramIndex}
      OR s.first_name ILIKE $${paramIndex}
      OR s.last_name ILIKE $${paramIndex}
    )`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.studentId) {
    conditions.push(`e.student_id = $${paramIndex}`);
    params.push(options.studentId);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.limit;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM alumni_employment e
     INNER JOIN students s ON s.id = e.student_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `SELECT e.*,
            TRIM(CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name)) AS alumni_name,
            s.admission_number
     FROM alumni_employment e
     INNER JOIN students s ON s.id = e.student_id
     ${whereClause}
     ORDER BY e.is_current DESC, e.start_date DESC NULLS LAST
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  return { items: listResult.rows as AlumniEmployment[], total };
}

export async function createEmployment(
  db: RequestDb,
  data: Omit<AlumniEmployment, 'id' | 'created_at' | 'alumni_name' | 'admission_number'>
): Promise<AlumniEmployment> {
  const alumniId = await ensureAlumniProfileForStudent(db, data.student_id);
  const result = await db.query(
    `INSERT INTO alumni_employment (
      alumni_id, student_id, company_name, job_title, industry, employment_type,
      start_date, end_date, is_current, location, remarks
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      alumniId,
      data.student_id,
      data.company_name,
      data.job_title ?? null,
      data.industry ?? null,
      data.employment_type || 'full_time',
      data.start_date ?? null,
      data.end_date ?? null,
      data.is_current ?? false,
      data.location ?? null,
      data.remarks ?? null,
    ]
  );
  return result.rows[0] as AlumniEmployment;
}

export async function updateEmployment(
  db: RequestDb,
  id: number,
  data: Partial<AlumniEmployment>
): Promise<AlumniEmployment | null> {
  const result = await db.query(
    `UPDATE alumni_employment SET
       company_name = COALESCE($2, company_name),
       job_title = COALESCE($3, job_title),
       industry = COALESCE($4, industry),
       employment_type = COALESCE($5, employment_type),
       start_date = COALESCE($6, start_date),
       end_date = COALESCE($7, end_date),
       is_current = COALESCE($8, is_current),
       location = COALESCE($9, location),
       remarks = COALESCE($10, remarks),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.company_name ?? null,
      data.job_title ?? null,
      data.industry ?? null,
      data.employment_type ?? null,
      data.start_date ?? null,
      data.end_date ?? null,
      data.is_current ?? null,
      data.location ?? null,
      data.remarks ?? null,
    ]
  );
  return (result.rows[0] as AlumniEmployment) ?? null;
}

export async function deleteEmployment(db: RequestDb, id: number): Promise<boolean> {
  const result = await db.query(`DELETE FROM alumni_employment WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listAlumniEvents(
  db: RequestDb,
  options: { search?: string; status?: string; page: number; limit: number }
): Promise<{ items: AlumniEvent[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.search) {
    conditions.push(`(ae.title ILIKE $${paramIndex} OR ae.venue ILIKE $${paramIndex})`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.status) {
    conditions.push(`ae.status = $${paramIndex}`);
    params.push(options.status);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.limit;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM alumni_events ae ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `SELECT ae.*,
            (SELECT COUNT(*)::int FROM alumni_event_registrations r WHERE r.event_id = ae.id) AS registration_count
     FROM alumni_events ae
     ${whereClause}
     ORDER BY ae.event_date DESC, ae.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  return { items: listResult.rows as AlumniEvent[], total };
}

export async function createAlumniEvent(
  db: RequestDb,
  data: Omit<AlumniEvent, 'id' | 'created_at' | 'registration_count'>,
  createdBy: { id: number; name: string }
): Promise<AlumniEvent> {
  const result = await db.query(
    `INSERT INTO alumni_events (
      title, description, event_date, event_time, venue, event_type,
      max_attendees, registration_deadline, status, created_by, created_by_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      data.title,
      data.description ?? null,
      data.event_date,
      data.event_time ?? null,
      data.venue ?? null,
      data.event_type || 'reunion',
      data.max_attendees ?? null,
      data.registration_deadline ?? null,
      data.status || 'scheduled',
      createdBy.id,
      createdBy.name,
    ]
  );
  return { ...(result.rows[0] as AlumniEvent), registration_count: 0 };
}

export async function updateAlumniEvent(
  db: RequestDb,
  id: number,
  data: Partial<AlumniEvent>
): Promise<AlumniEvent | null> {
  const result = await db.query(
    `UPDATE alumni_events SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       event_date = COALESCE($4, event_date),
       event_time = COALESCE($5, event_time),
       venue = COALESCE($6, venue),
       event_type = COALESCE($7, event_type),
       max_attendees = COALESCE($8, max_attendees),
       registration_deadline = COALESCE($9, registration_deadline),
       status = COALESCE($10, status),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.title ?? null,
      data.description ?? null,
      data.event_date ?? null,
      data.event_time ?? null,
      data.venue ?? null,
      data.event_type ?? null,
      data.max_attendees ?? null,
      data.registration_deadline ?? null,
      data.status ?? null,
    ]
  );
  if (result.rows.length === 0) return null;
  const event = result.rows[0] as AlumniEvent;
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM alumni_event_registrations WHERE event_id = $1`,
    [id]
  );
  event.registration_count = parseInt(countResult.rows[0]?.count || '0', 10);
  return event;
}

export async function deleteAlumniEvent(db: RequestDb, id: number): Promise<boolean> {
  const result = await db.query(`DELETE FROM alumni_events WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listSuccessStories(
  db: RequestDb,
  options: { search?: string; publishedOnly?: boolean; page: number; limit: number }
): Promise<{ items: AlumniSuccessStory[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.search) {
    conditions.push(`(ss.title ILIKE $${paramIndex} OR ss.story ILIKE $${paramIndex})`);
    params.push(`%${options.search}%`);
    paramIndex += 1;
  }

  if (options.publishedOnly) {
    conditions.push(`ss.is_published = true`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (options.page - 1) * options.limit;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM alumni_success_stories ss ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  const listResult = await db.query(
    `SELECT ss.*,
            TRIM(CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name)) AS alumni_name,
            s.admission_number,
            ap.batch_year
     FROM alumni_success_stories ss
     INNER JOIN students s ON s.id = ss.student_id
     INNER JOIN alumni_profiles ap ON ap.id = ss.alumni_id
     ${whereClause}
     ORDER BY ss.is_published DESC, ss.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, options.limit, offset]
  );

  return { items: listResult.rows as AlumniSuccessStory[], total };
}

export async function createSuccessStory(
  db: RequestDb,
  data: Omit<
    AlumniSuccessStory,
    'id' | 'created_at' | 'alumni_name' | 'admission_number' | 'batch_year' | 'published_at'
  >,
  createdBy: { id: number; name: string }
): Promise<AlumniSuccessStory> {
  const alumniId = await ensureAlumniProfileForStudent(db, data.student_id);
  const result = await db.query(
    `INSERT INTO alumni_success_stories (
      alumni_id, student_id, title, story, achievement_summary, photo_url,
      is_published, published_at, created_by, created_by_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      alumniId,
      data.student_id,
      data.title,
      data.story,
      data.achievement_summary ?? null,
      data.photo_url ?? null,
      data.is_published ?? false,
      data.is_published ? new Date().toISOString() : null,
      createdBy.id,
      createdBy.name,
    ]
  );
  return result.rows[0] as AlumniSuccessStory;
}

export async function updateSuccessStory(
  db: RequestDb,
  id: number,
  data: Partial<AlumniSuccessStory>
): Promise<AlumniSuccessStory | null> {
  const publishedAt =
    data.is_published === true
      ? new Date().toISOString()
      : data.is_published === false
        ? null
        : undefined;

  const result = await db.query(
    `UPDATE alumni_success_stories SET
       title = COALESCE($2, title),
       story = COALESCE($3, story),
       achievement_summary = COALESCE($4, achievement_summary),
       photo_url = COALESCE($5, photo_url),
       is_published = COALESCE($6, is_published),
       published_at = CASE
         WHEN $6 = true AND published_at IS NULL THEN CURRENT_TIMESTAMP
         WHEN $6 = false THEN NULL
         ELSE published_at
       END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.title ?? null,
      data.story ?? null,
      data.achievement_summary ?? null,
      data.photo_url ?? null,
      data.is_published ?? null,
    ]
  );
  return (result.rows[0] as AlumniSuccessStory) ?? null;
}

export async function deleteSuccessStory(db: RequestDb, id: number): Promise<boolean> {
  const result = await db.query(`DELETE FROM alumni_success_stories WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listAlumniForSelect(
  db: RequestDb,
  search?: string
): Promise<Array<{ id: number; student_id: number; full_name: string; admission_number: string; batch_year?: string }>> {
  await syncAlumniProfiles(db);
  const params: unknown[] = [ALUMNI_EXIT_REASON_CODE];
  let searchClause = '';
  if (search) {
    searchClause = `AND (s.first_name ILIKE $2 OR s.last_name ILIKE $2 OR s.admission_number ILIKE $2)`;
    params.push(`%${search}%`);
  }

  const result = await db.query(
    `WITH ${HIGHEST_CLASS_CTE}
     SELECT ap.id, ap.student_id, ap.batch_year, s.admission_number,
            TRIM(CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name)) AS full_name
     FROM alumni_profiles ap
     INNER JOIN students s ON s.id = ap.student_id
     INNER JOIN student_exits se ON se.student_id = s.id
       AND se.status = 'EXITED'
       AND se.exit_reason_code = $1
     CROSS JOIN highest_class hc
     ${LATEST_ENROLLMENT_LATERAL}
     WHERE ${ALUMNI_HIGHEST_CLASS_MATCH} ${searchClause}
     ORDER BY s.first_name, s.last_name
     LIMIT 500`,
    params
  );

  return result.rows as Array<{
    id: number;
    student_id: number;
    full_name: string;
    admission_number: string;
    batch_year?: string;
  }>;
}

export async function fetchAlumniStudentsForIdCards(
  db: RequestDb,
  studentIds: number[]
): Promise<Array<Record<string, unknown>>> {
  if (studentIds.length === 0) return [];
  const result = await db.query(
    `WITH ${HIGHEST_CLASS_CTE}
     SELECT s.*, ap.batch_year, ap.last_class, ap.exit_date,
            ap.last_class AS class_name
     FROM students s
     INNER JOIN alumni_profiles ap ON ap.student_id = s.id
     INNER JOIN student_exits se ON se.student_id = s.id
       AND se.status = 'EXITED'
       AND se.exit_reason_code = $2
     CROSS JOIN highest_class hc
     ${LATEST_ENROLLMENT_LATERAL}
     WHERE s.id = ANY($1::int[])
       AND ${ALUMNI_HIGHEST_CLASS_MATCH}`,
    [studentIds, ALUMNI_EXIT_REASON_CODE]
  );
  return result.rows;
}
