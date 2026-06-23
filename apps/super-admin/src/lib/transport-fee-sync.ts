import type { RequestDb } from '@/lib/request-db';
import { parseAcademicYearStart, dueDateForMonth } from '@/lib/fees/AcademicYear';
import {
  FeeGenerationService,
  getActiveTransportAssignment,
  type TransportAssignmentInfo,
} from '@/lib/fees/FeeGenerationService';

export { parseAcademicYearStart, dueDateForMonth as dueDateForAcademicMonth, getActiveTransportAssignment };
export type { TransportAssignmentInfo };

export async function getOrCreateTransportFeeStructure(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  return FeeGenerationService.getOrCreateTransportFeeStructure(db, academicYear);
}

export async function syncTransportFeesForStudent(
  db: RequestDb,
  studentId: number,
  academicYear: string
) {
  return FeeGenerationService.syncTransportFeesForStudent(db, studentId, academicYear);
}

export async function cleanupOrphanedTransportFees(db: RequestDb, academicYear: string) {
  return FeeGenerationService.cleanupOrphanedTransportFees(db, academicYear);
}

export async function syncTransportFees(
  db: RequestDb,
  academicYear: string,
  studentId?: number
) {
  const result = await FeeGenerationService.generateTransportFees(db, {
    academicYear,
    studentId,
  });

  return {
    students_processed: result.students_processed,
    created: result.created,
    updated: result.updated,
    removed: result.removed,
  };
}
