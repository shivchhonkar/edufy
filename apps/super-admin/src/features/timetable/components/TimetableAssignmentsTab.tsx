'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiExternalLink, FiUserCheck } from 'react-icons/fi';

export default function TimetableAssignmentsTab() {
  const [stats, setStats] = useState({ assignments: 0, classSubjects: 0, unassigned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/academic-assignments/overview')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const assignments = d.data.assignments?.length ?? 0;
          const classSubjects = d.data.classSubjects?.length ?? 0;
          const assignedKeys = new Set(
            (d.data.assignments ?? []).map(
              (a: { class_id: number; subject_id: number }) => `${a.class_id}-${a.subject_id}`,
            ),
          );
          const unassigned = (d.data.classSubjects ?? []).filter(
            (cs: { class_id: number; subject_id: number }) =>
              !assignedKeys.has(`${cs.class_id}-${cs.subject_id}`),
          ).length;
          setStats({ assignments, classSubjects, unassigned });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Step 4 — Academic Assignments</p>
        <p className="text-xs mt-0.5 text-blue-700">
          Map teachers to subjects and classes. The timetable builder auto-fills the teacher when you schedule a subject.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Teacher assignments</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading ? '—' : stats.assignments}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Class–subject links</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading ? '—' : stats.classSubjects}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Without teacher</p>
          <p className={`text-2xl font-semibold mt-1 ${stats.unassigned > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {loading ? '—' : stats.unassigned}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FiUserCheck className="text-primary-600" />
            Manage assignments
          </h3>
          <p className="text-sm text-gray-600 mt-1 max-w-xl">
            Use the Assignments page for class-wise, teacher-wise, bulk assignment, and workload views.
            Complete assignments before building timetables.
          </p>
        </div>
        <Link
          href="/academics/assignments"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Open Assignments
          <FiExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {stats.unassigned > 0 && !loading && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {stats.unassigned} class–subject combination(s) still need a teacher. Scheduling those subjects
          in the builder may leave the teacher field empty until assigned.
        </div>
      )}
    </div>
  );
}
