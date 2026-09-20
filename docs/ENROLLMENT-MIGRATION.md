# Enrollment-Centric Data Model

This document describes the enrollment-centric migration implemented across four phases.

## Architecture

```
Student (permanent identity)
  └── student_enrollments (session anchor — one current row per student)
        └── attendance, student_fees, exam_results, student_transport, homework_submissions, fee_payments
              (all include enrollment_id + student_id)
```

## Key modules

| File | Purpose |
|------|---------|
| `apps/super-admin/src/lib/enrollment-service.ts` | `getCurrentEnrollment`, `resolveEnrollment`, `createCurrentEnrollment`, backfill |
| `apps/super-admin/src/lib/ensure-enrollment-schema.ts` | DDL + backfill for enrollment_id columns |
| `apps/super-admin/src/lib/enrollment-sql.ts` | Shared JOIN fragments for reads |
| `apps/super-admin/src/shared/context/EnrollmentContext.tsx` | UI session selector (academic_year_id) |
| `apps/super-admin/src/app/api/enrollment/context/route.ts` | API: context + backfill |

## Phase summary

### Phase 1 — Standardize enrollment
- `createCurrentEnrollment()` requires `academic_year_id` via `resolveAcademicYearRecord()`
- New student/admission flows write placement to **enrollment only** (not `students.class_id`)
- `getCurrentEnrollment` / `resolveEnrollment` centralized in `enrollment-service.ts`
- Unique partial index: one `is_current = true` per student (existing)

### Phase 2 — enrollment_id on child tables
- Columns added on: `attendance`, `student_fees`, `exam_results`, `student_transport`, `homework_submissions`, `fee_payments`
- Backfill via `runEnrollmentBackfill()` or `POST /api/enrollment/context`
- Writes set both `student_id` and `enrollment_id`

### Phase 3 — Reads via enrollment
- Student list/detail APIs join current enrollment (`enrollment-sql.ts`)
- Attendance, transport list, exam results writes resolve enrollment
- `EnrollmentProvider` exposes `sessionQueryParams` for UI modules

### Phase 4 — Reduce duplication
- `student_fees.academic_year` and `fee_payments.academic_year` made nullable
- New fee rows still populate `academic_year` from enrollment for legacy unique constraints
- `student_id` retained on child tables for reporting indexes

## Running backfill

**API (authenticated admin):**
```
POST /api/enrollment/context
```

**CLI:**
```
node scripts/migrate-enrollment-centric.js --db-name=your_tenant_db
```

## UI usage

```tsx
import { useEnrollmentSession, withSessionQuery } from '@/shared/context/EnrollmentContext';

const { sessionQueryParams, selectedAcademicYear } = useEnrollmentSession();
fetch(withSessionQuery('/api/fees/student-fees', sessionQueryParams));
```

## Remaining work (optional follow-ups)

- Update every remaining read route (parent portal, teacher portal, reports) to use enrollment joins
- Add session selector component to module headers (fees, attendance, exams)
- `InstallmentService` and direct `student_fees` INSERT paths outside `FeeGenerationService`
- Eventually drop denormalized `students.class_id` after all reads migrated
