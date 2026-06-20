export type GradeInfo = { grade: string; remarks: string };

/** @deprecated Import from @/services/exams/grading-engine */
export {
  cbseGrade,
  overallGradeLabel,
  CBSE_GRADE_SCALE,
  gradeFromPercentage,
  loadGradingScale,
  gradeForSubjectMarks,
} from '@/services/exams/grading-engine';
