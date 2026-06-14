'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiBook } from 'react-icons/fi';
import type { StudentEnrollment } from '@/shared/types';
import { formatStudentDate } from '@/features/students/utils/student-profile';

interface EnrollmentsTabProps {
  studentId: number;
}

interface EnrollmentRow extends StudentEnrollment {
  class_name?: string;
  section_name?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  promoted: 'bg-blue-100 text-blue-800',
  repeated: 'bg-yellow-100 text-yellow-800',
  transferred: 'bg-orange-100 text-orange-800',
  left: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  promoted: 'Promoted',
  repeated: 'Repeated',
  transferred: 'Transferred',
  left: 'Left',
};

export default function EnrollmentsTab({ studentId }: EnrollmentsTabProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/enrollments`);
      const data = await res.json();
      if (data.success) setEnrollments(data.data);
      else setError(data.error || 'Failed to load enrollments');
    } catch {
      setError('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading academic history...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
        <FiBook className="mx-auto w-10 h-10 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No enrollment history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrollments.map((e, index) => (
        <div
          key={e.id}
          className={`relative bg-white border rounded-lg p-4 ${
            e.is_current ? 'border-primary-300 ring-1 ring-primary-100' : 'border-gray-200'
          }`}
        >
          {index < enrollments.length - 1 && (
            <div className="absolute left-6 top-full h-3 w-0.5 bg-gray-200" aria-hidden />
          )}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{e.academic_year}</span>
                {e.is_current && (
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full font-medium">
                    Current
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_STYLES[e.status] || STATUS_STYLES.active
                  }`}
                >
                  {STATUS_LABELS[e.status] || e.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2">
                {e.class_name || '—'}
                {e.section_name ? ` · Section ${e.section_name}` : ''}
                {e.roll_number ? ` · Roll ${e.roll_number}` : ''}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              {e.is_current
                ? `Since ${formatStudentDate(e.created_at)}`
                : `${formatStudentDate(e.created_at)} – ${formatStudentDate(e.updated_at)}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
