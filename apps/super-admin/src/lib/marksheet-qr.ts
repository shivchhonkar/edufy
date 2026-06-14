export type MarksheetQrPayload = {
  type: 'marksheet';
  serial_no: string;
  admission_number: string;
  roll_number?: string | null;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  academic_year: string;
  school_name: string;
  result: string;
  percentage: number;
  grade: string;
  grand_total_obtained: number;
  grand_total_max: number;
  issued_at: string;
};

export function buildMarksheetQrPayload(input: {
  serialNo: string;
  admissionNumber: string;
  rollNumber?: string | null;
  firstName: string;
  lastName: string;
  className: string;
  sectionName?: string | null;
  academicYear: string;
  schoolName: string;
  result: string;
  percentage: number;
  grade: string;
  grandTotalObtained: number;
  grandTotalMax: number;
  issuedAt: string;
}): MarksheetQrPayload {
  return {
    type: 'marksheet',
    serial_no: input.serialNo,
    admission_number: input.admissionNumber,
    roll_number: input.rollNumber,
    student_name: `${input.firstName} ${input.lastName}`.trim(),
    class_name: input.className,
    section_name: input.sectionName,
    academic_year: input.academicYear,
    school_name: input.schoolName,
    result: input.result,
    percentage: input.percentage,
    grade: input.grade,
    grand_total_obtained: input.grandTotalObtained,
    grand_total_max: input.grandTotalMax,
    issued_at: input.issuedAt,
  };
}

/** Scannable verification URL — opens public verify page for this student record. */
export function buildMarksheetQrValue(payload: MarksheetQrPayload, baseUrl?: string): string {
  const origin = baseUrl?.replace(/\/$/, '') || '';
  if (origin) {
    const params = new URLSearchParams({
      adm: payload.admission_number,
      serial: payload.serial_no,
      ay: payload.academic_year,
    });
    return `${origin}/verify/marksheet?${params.toString()}`;
  }
  return JSON.stringify(payload);
}

export function parseMarksheetQrQuery(searchParams: URLSearchParams) {
  return {
    admission_number: searchParams.get('adm')?.trim() || '',
    serial_no: searchParams.get('serial')?.trim() || '',
    academic_year: searchParams.get('ay')?.trim() || '',
  };
}
