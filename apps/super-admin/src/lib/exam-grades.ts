export type GradeInfo = { grade: string; remarks: string };

/** CBSE-style grade from percentage */
export function cbseGrade(percentage: number): GradeInfo {
  if (percentage >= 91) return { grade: 'A1', remarks: 'EXCELLENT' };
  if (percentage >= 81) return { grade: 'A2', remarks: 'VERY GOOD' };
  if (percentage >= 71) return { grade: 'B1', remarks: 'GOOD' };
  if (percentage >= 61) return { grade: 'B2', remarks: 'FAIR' };
  if (percentage >= 51) return { grade: 'C1', remarks: 'SATISFACTORY' };
  if (percentage >= 41) return { grade: 'C2', remarks: 'AVERAGE' };
  if (percentage >= 33) return { grade: 'D', remarks: 'NEEDS IMPROVEMENT' };
  return { grade: 'E', remarks: 'NEEDS IMPROVEMENT' };
}

export function overallGradeLabel(percentage: number): string {
  const { grade, remarks } = cbseGrade(percentage);
  return `${grade} (${remarks})`;
}

export const CBSE_GRADE_SCALE = [
  { grade: 'A1', range: '91 – 100', remarks: 'EXCELLENT' },
  { grade: 'A2', range: '81 – 90', remarks: 'VERY GOOD' },
  { grade: 'B1', range: '71 – 80', remarks: 'GOOD' },
  { grade: 'B2', range: '61 – 70', remarks: 'FAIR' },
  { grade: 'C1', range: '51 – 60', remarks: 'SATISFACTORY' },
  { grade: 'C2', range: '41 – 50', remarks: 'AVERAGE' },
  { grade: 'D', range: '33 – 40', remarks: 'NEEDS IMPROVEMENT' },
  { grade: 'E', range: '32 & BELOW', remarks: 'NEEDS IMPROVEMENT' },
];
