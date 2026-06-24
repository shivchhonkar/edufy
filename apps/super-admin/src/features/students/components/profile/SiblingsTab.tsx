'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiExternalLink, FiUsers } from 'react-icons/fi';
import { studentFullName } from '@/features/students/utils/student-profile';
import type { Student } from '@/shared/types';

interface SiblingRow {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  admission_number: string;
  roll_number?: string | null;
  status: string;
  class_name?: string | null;
  section_name?: string | null;
}

interface SiblingsTabProps {
  studentId: number;
  onViewSibling?: (student: Student & { class_name?: string; section_name?: string }) => void;
}

function formatClassSection(className?: string | null, sectionName?: string | null) {
  if (!className) return 'No class';
  return sectionName ? `${className} · ${sectionName}` : className;
}

export default function SiblingsTab({ studentId, onViewSibling }: SiblingsTabProps) {
  const [siblings, setSiblings] = useState<SiblingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<number | null>(null);

  const loadSiblings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/siblings`);
      const data = await res.json();
      if (data.success) {
        setSiblings(data.data);
      } else {
        setError(data.error || 'Failed to load siblings');
        setSiblings([]);
      }
    } catch {
      setError('Failed to load siblings');
      setSiblings([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadSiblings();
  }, [loadSiblings]);

  const openSiblingProfile = async (siblingId: number) => {
    if (!onViewSibling) return;
    setOpeningId(siblingId);
    try {
      const res = await fetch(`/api/students/${siblingId}`);
      const data = await res.json();
      if (data.success && data.data) {
        onViewSibling(data.data);
      }
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Loading siblings...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <FiUsers className="text-primary-600" />
          Siblings
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Students registered in this school who share the same parent or guardian contact number.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {siblings.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
          <FiUsers className="mx-auto w-10 h-10 text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No registered siblings found.</p>
          <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
            Add matching parent or guardian phone numbers on both students to link them as siblings.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    S.N.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Roll No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Class · Section
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Profile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {siblings.map((sibling, index) => (
                  <tr key={sibling.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {studentFullName(sibling)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {sibling.roll_number || sibling.admission_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatClassSection(sibling.class_name, sibling.section_name)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onViewSibling ? (
                        <button
                          type="button"
                          onClick={() => openSiblingProfile(sibling.id)}
                          disabled={openingId === sibling.id}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 disabled:opacity-50"
                        >
                          View profile
                          <FiExternalLink size={14} />
                        </button>
                      ) : (
                        <a
                          href={`/students/${sibling.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
                        >
                          View profile
                          <FiExternalLink size={14} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
