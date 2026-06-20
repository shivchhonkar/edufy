# Examination Result Processing Engine

## Architecture Overview

```
Marks Entry (exam_results)
        ↓
compileExamResults()
        ↓
student_exam_summary  ← single source of truth
        ↓
Workflow: draft → under_review → approved → published
        ↓
Parent Portal / Report Cards / Marksheets / Promotions / Analytics
```

**Design principle:** Raw marks remain in `exam_results`. Compiled outcomes live in `student_exam_summary`. Existing report card and marksheet APIs are preserved; they now consume the unified grading engine and can optionally read compiled summaries.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `student_exam_summary` | Compiled per-student result (%, grade, pass/fail, ranks) |
| `grading_config` | Configurable CBSE A1–E scale |
| `promotion_rules` | Per-class promotion thresholds |
| `student_promotion_recommendations` | PROMOTE / DETAIN / REVIEW after annual/final compile |
| `exam_result_audit_log` | Workflow + compile audit trail |
| `exams.result_workflow_status` | draft \| under_review \| approved \| published |

**Migration:** `database/migrations/phase21_exam_result_engine.sql`

**Runtime ensure:** `apps/super-admin/src/lib/ensure-exam-result-engine.ts`

**Prisma reference (documentation only):** `packages/database/prisma/schema-exams.prisma`

---

## Service Layer

| Service | Path | Responsibility |
|---------|------|----------------|
| Grading Engine | `services/exams/grading-engine.ts` | Single CBSE scale; pass/fail rules |
| Ranking Engine | `services/exams/ranking-engine.ts` | Class / section / school ranks |
| Result Compiler | `services/exams/result-compiler.ts` | `compileExamResults(examId)` |
| Promotion Engine | `services/exams/promotion-engine.ts` | Recommendations after annual/final |
| Exam Analytics | `services/exams/exam-analytics.ts` | KPIs, toppers, at-risk students |
| Exam Audit | `services/exams/exam-audit.ts` | Workflow transitions + audit log |

### Pass rules

Student **PASS** only when:

1. Every subject: `marks_obtained >= passing_marks` and not absent
2. Overall `percentage >= exams.minimum_overall_percentage` (default 33%)

### Ranking rules

1. Higher percentage ranks first
2. Tie: higher total obtained marks
3. Tie: alphabetical name
4. Dense ranking (1, 2, 2, 4)

---

## API Endpoints

| Method | Route | Auth | Action |
|--------|-------|------|--------|
| POST | `/api/exams/[id]/compile` | HR Admin | Compile all students |
| POST | `/api/exams/[id]/submit-review` | HR Admin | → under_review |
| POST | `/api/exams/[id]/approve` | HR Admin | → approved |
| POST | `/api/exams/[id]/publish` | HR Admin | → published + publish summaries |
| POST | `/api/exams/[id]/unpublish` | HR Admin | → draft + hide from parents |
| GET | `/api/exams/[id]/summaries` | HR Read | List compiled summaries |
| GET | `/api/exams/analytics?exam_id=` | HR Read | Exam analytics dashboard data |
| GET/POST | `/api/promotion-recommendations` | Read/Admin | Recommendations + rules |

**Preserved (unchanged routes):** `/api/exams`, `/api/exams/[id]/results`, `/api/report-cards`, `/api/marksheets`

---

## UI Components

| Component | Location |
|-----------|----------|
| `publish-workflow.tsx` | Compile + workflow buttons |
| `workflow-badge.tsx` | Draft / Under Review / Approved / Published |
| `result-compilation-card.tsx` | Summary preview |
| `ranking-table.tsx` | Rank display |
| `exam-analytics.tsx` | Analytics panel |
| `promotion-recommendations.tsx` | Promotion buckets |

**Pages:** `/exams` (enhanced), `/exams/analytics`

---

## Parent Portal

`apps/parent-portal/src/app/api/results/route.ts` now shows results only when:

- `student_exam_summary.publish_status = 'published'`, **or**
- Legacy fallback: no summary row AND `exams.result_workflow_status = 'published'`

Includes ranks and overall grade from summary when available.

---

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing exams (pre-migration) | `result_workflow_status` defaults to **published** |
| No compiled summary | Report cards / marksheets still use `exam_results` |
| Old grade scales in UI | `exam-grades.ts` re-exports grading engine |
| Parent portal legacy | Uncompiled but published exams still visible |

---

## Multi-Tenant Safety

- Each school uses an isolated tenant database (existing pattern)
- `tenant_id` on summary/audit/recommendations stores JWT tenant for cross-DB exports
- All APIs use `getRequestDb()` tenant resolution

---

## Performance (10,000+ students)

- Batch upsert in compile transaction
- Indexes on `(exam_id)`, `(exam_id, student_id)`, ranks, publish_status
- Analytics uses aggregated SQL; consider materialized views at scale
- Ranking is in-memory O(n log n) per exam — fine for 10k per exam

---

## Implementation Order

1. ✅ Run migration `phase21_exam_result_engine.sql`
2. ✅ Deploy services + workflow APIs
3. ✅ Wire exams page workflow UI
4. ✅ Parent portal publish gate
5. ⏳ Enrich marksheets with ranks from summary (optional next)
6. ⏳ Promotions page full integration panel
7. ⏳ Grading config admin UI
8. ⏳ PDF export from compiled summary
9. ⏳ Teacher marks entry portal
10. ⏳ Bulk Excel import

---

## Rollback Strategy

1. **Soft rollback:** Set all exams to `result_workflow_status = 'published'`; parents see legacy path
2. **Disable gate:** Revert parent portal filter to show all `exam_results`
3. **Schema rollback (if needed):**
   ```sql
   DROP TABLE IF EXISTS exam_result_audit_log;
   DROP TABLE IF EXISTS student_promotion_recommendations;
   DROP TABLE IF EXISTS promotion_rules;
   DROP TABLE IF EXISTS student_exam_summary;
   DROP TABLE IF EXISTS grading_config;
   ALTER TABLE exams DROP COLUMN IF EXISTS result_workflow_status;
   -- (drop other phase21 exam columns)
   ```
4. Raw marks in `exam_results` are never deleted by this engine

---

## Risks

| Risk | Mitigation |
|------|------------|
| New exams start as **draft** — parents see nothing until publish | Document workflow; legacy exams stay published |
| Re-compile resets draft summaries | Published summaries stay published on upsert |
| Three grade scales existed | Centralized in `grading-engine.ts` |
| Promotion UNIQUE with NULL academic_year | Add partial index in follow-up |
| CHECK constraint on workflow column | ensure schema uses simple VARCHAR add |

---

## Applying Migration

```bash
# Via setup script (tenant DB)
node scripts/setup-production.js

# Or API first-request auto-ensure on compile/publish
# Or manual:
psql -d Shribi_Edufy_global -f database/migrations/phase21_exam_result_engine.sql
```
