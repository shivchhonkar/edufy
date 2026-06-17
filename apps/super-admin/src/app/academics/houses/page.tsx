'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { studentFullName } from '@/features/students/utils/student-profile';
import type { SchoolHouse } from '@/lib/house-utils';
import {
  FiArrowLeft,
  FiEdit2,
  FiFlag,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';

interface ClassOption {
  id: number;
  name: string;
}

interface SectionOption {
  id: number;
  class_id: number;
  name: string;
}

interface HouseStudent {
  id: number;
  admission_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_name?: string | null;
  section_name?: string | null;
  house_id?: number | null;
  house_name?: string | null;
  house_color?: string | null;
}

const HOUSE_COLOR_PRESETS = [
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

const EMPTY_HOUSE_FORM = {
  name: '',
  code: '',
  color: '#2563eb',
  description: '',
  sort_order: 0,
  is_active: true,
};

export default function HousesPage() {
  const { alert, confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<'houses' | 'assign'>('houses');
  const [houses, setHouses] = useState<SchoolHouse[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<SchoolHouse | null>(null);
  const [houseForm, setHouseForm] = useState(EMPTY_HOUSE_FORM);
  const [houseSaving, setHouseSaving] = useState(false);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState('');
  const [students, setStudents] = useState<HouseStudent[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [bulkHouseId, setBulkHouseId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchHouses = useCallback(async () => {
    setHousesLoading(true);
    try {
      const res = await fetch('/api/houses');
      const json = await res.json();
      if (json.success) setHouses(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setHousesLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', page: '1' });
      if (studentSearch) params.set('search', studentSearch);
      if (classFilter) params.set('class_id', classFilter);
      if (sectionFilter) params.set('section_id', sectionFilter);
      if (houseFilter) params.set('house_id', houseFilter);

      const res = await fetch(`/api/houses/students?${params}`);
      const json = await res.json();
      if (json.success) {
        setStudents(json.data.items);
        setStudentsTotal(json.data.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStudentsLoading(false);
    }
  }, [studentSearch, classFilter, sectionFilter, houseFilter]);

  useEffect(() => {
    fetchHouses();
    fetch('/api/classes')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClasses(json.data);
      })
      .catch(console.error);
  }, [fetchHouses]);

  useEffect(() => {
    if (classFilter) {
      fetch(`/api/sections?class_id=${classFilter}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setSections(json.data);
        })
        .catch(console.error);
    } else {
      setSections([]);
      setSectionFilter('');
    }
  }, [classFilter]);

  useEffect(() => {
    if (activeTab === 'assign') fetchStudents();
  }, [activeTab, fetchStudents]);

  const openCreateHouse = () => {
    setEditingHouse(null);
    setHouseForm({ ...EMPTY_HOUSE_FORM, sort_order: houses.length });
    setShowHouseModal(true);
  };

  const openEditHouse = (house: SchoolHouse) => {
    setEditingHouse(house);
    setHouseForm({
      name: house.name,
      code: house.code || '',
      color: house.color || '#2563eb',
      description: house.description || '',
      sort_order: house.sort_order ?? 0,
      is_active: house.is_active !== false,
    });
    setShowHouseModal(true);
  };

  const saveHouse = async () => {
    if (!houseForm.name.trim()) {
      await alert('House name is required.', { title: 'Missing name', type: 'warning' });
      return;
    }

    setHouseSaving(true);
    try {
      const url = editingHouse ? `/api/houses/${editingHouse.id}` : '/api/houses';
      const method = editingHouse ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: houseForm.name.trim(),
          code: houseForm.code.trim() || null,
          color: houseForm.color,
          description: houseForm.description.trim() || null,
          sort_order: houseForm.sort_order,
          is_active: houseForm.is_active,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowHouseModal(false);
        await fetchHouses();
        await alert(editingHouse ? 'House updated.' : 'House created.', {
          title: 'Saved',
          type: 'success',
        });
      } else {
        await alert(json.error || 'Failed to save house', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to save house', { title: 'Error', type: 'error' });
    } finally {
      setHouseSaving(false);
    }
  };

  const deleteHouse = async (house: SchoolHouse) => {
    const ok = await confirm(
      `Delete house "${house.name}"? Students in this house will be unassigned.`,
      { title: 'Delete house', type: 'danger', confirmText: 'Delete' }
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/houses/${house.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchHouses();
        if (activeTab === 'assign') fetchStudents();
      } else {
        await alert(json.error || 'Failed to delete house', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Failed to delete house', { title: 'Error', type: 'error' });
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const assignSelected = async () => {
    if (selectedStudentIds.size === 0) {
      await alert('Select at least one student.', { title: 'No selection', type: 'warning' });
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/houses/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: Array.from(selectedStudentIds),
          house_id: bulkHouseId === '' ? null : bulkHouseId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedStudentIds(new Set());
        await fetchHouses();
        await fetchStudents();
        await alert(
          bulkHouseId === ''
            ? `${json.data.assigned_count} student(s) removed from houses.`
            : `${json.data.assigned_count} student(s) assigned to house.`,
          { title: 'Assigned', type: 'success' }
        );
      } else {
        await alert(json.error || 'Assignment failed', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Assignment failed', { title: 'Error', type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const assignSingle = async (studentId: number, houseId: string) => {
    try {
      const res = await fetch('/api/houses/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: [studentId],
          house_id: houseId === '' ? null : parseInt(houseId, 10),
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchHouses();
        await fetchStudents();
      } else {
        await alert(json.error || 'Assignment failed', { title: 'Error', type: 'error' });
      }
    } catch {
      await alert('Assignment failed', { title: 'Error', type: 'error' });
    }
  };

  const activeHouses = useMemo(() => houses.filter((h) => h.is_active !== false), [houses]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <Link
            href="/academics/classes"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-1"
          >
            <FiArrowLeft size={14} /> Academics
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FiFlag className="text-primary-600" />
            School Houses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create houses and assign students for sports, competitions, and school events.
          </p>
        </div>

        <div className="flex gap-2 border-b">
          {(['houses', 'assign'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 'houses' ? 'Manage Houses' : 'Assign Students'}
            </button>
          ))}
        </div>

        {activeTab === 'houses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">{houses.length} house(s)</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchHouses}
                  className="border px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
                >
                  <FiRefreshCw size={15} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={openCreateHouse}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-primary-700"
                >
                  <FiPlus size={16} /> Add House
                </button>
              </div>
            </div>

            {housesLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
              </div>
            ) : houses.length === 0 ? (
              <div className="bg-white border rounded-lg p-10 text-center text-gray-500">
                <FiFlag className="mx-auto mb-3 text-gray-300" size={36} />
                <p>No houses yet. Create your first house to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {houses.map((house) => (
                  <div
                    key={house.id}
                    className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="h-2" style={{ backgroundColor: house.color || '#2563eb' }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{house.name}</h3>
                          {house.code && (
                            <p className="text-xs text-gray-500 font-mono">{house.code}</p>
                          )}
                        </div>
                        <span
                          className="w-8 h-8 rounded-lg border shrink-0"
                          style={{ backgroundColor: house.color || '#2563eb' }}
                          title={house.color}
                        />
                      </div>
                      {house.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{house.description}</p>
                      )}
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <FiUsers size={14} className="text-gray-400" />
                        {house.student_count ?? 0} student(s)
                      </p>
                      <div className="flex items-center gap-1 pt-1 border-t">
                        <button
                          type="button"
                          onClick={() => openEditHouse(house)}
                          className="p-2 rounded hover:bg-blue-50 text-blue-600"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHouse(house)}
                          className="p-2 rounded hover:bg-red-50 text-red-600"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                        {!house.is_active && (
                          <span className="ml-auto text-[10px] uppercase text-amber-600 font-semibold">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assign' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="relative flex-1 min-w-[180px]">
                  <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <label className="block text-sm min-w-[130px]">
                  <span className="text-gray-600 text-xs">Class</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={classFilter}
                    onChange={(e) => {
                      setClassFilter(e.target.value);
                      setSectionFilter('');
                    }}
                  >
                    <option value="">All classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm min-w-[130px]">
                  <span className="text-gray-600 text-xs">Section</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                    value={sectionFilter}
                    disabled={!classFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                  >
                    <option value="">All sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm min-w-[130px]">
                  <span className="text-gray-600 text-xs">House</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={houseFilter}
                    onChange={(e) => setHouseFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="none">Unassigned</option>
                    {houses.map((h) => (
                      <option key={h.id} value={String(h.id)}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={fetchStudents}
                  className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Apply
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-sm text-gray-600">
                  {selectedStudentIds.size} selected · {studentsTotal} shown
                </span>
                <select
                  className="border rounded-lg px-3 py-2 text-sm ml-auto"
                  value={bulkHouseId}
                  onChange={(e) => setBulkHouseId(e.target.value)}
                >
                  <option value="">Remove from house</option>
                  {activeHouses.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      Assign to {h.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={assignSelected}
                  disabled={assigning || selectedStudentIds.size === 0}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-40"
                >
                  {assigning ? 'Assigning...' : 'Apply to selected'}
                </button>
              </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selectedStudentIds.size === students.length}
                        onChange={toggleAllStudents}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Current house</th>
                    <th className="px-4 py-3 font-medium min-w-[160px]">Assign house</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                        No students match your filters.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            aria-label={`Select ${studentFullName(student)}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{studentFullName(student)}</p>
                          <p className="text-xs text-gray-500 font-mono">{student.admission_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {[student.class_name, student.section_name].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {student.house_name ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: student.house_color || '#cbd5e1',
                                color: student.house_color || '#334155',
                                backgroundColor: `${student.house_color || '#e2e8f0'}18`,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: student.house_color || '#94a3b8' }}
                              />
                              {student.house_name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
                            value={student.house_id ? String(student.house_id) : ''}
                            onChange={(e) => assignSingle(student.id, e.target.value)}
                          >
                            <option value="">— None —</option>
                            {activeHouses.map((h) => (
                              <option key={h.id} value={String(h.id)}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showHouseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHouseModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingHouse ? 'Edit House' : 'Add House'}
              </h2>
              <button
                type="button"
                onClick={() => setShowHouseModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm">
                <span className="text-gray-700">House name *</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={houseForm.name}
                  onChange={(e) => setHouseForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Red House"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">Code (optional)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  value={houseForm.code}
                  onChange={(e) => setHouseForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="RED"
                />
              </label>
              <div>
                <span className="text-sm text-gray-700">Color</span>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  {HOUSE_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setHouseForm((f) => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-lg border-2 ${
                        houseForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={houseForm.color}
                    onChange={(e) => setHouseForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-8 rounded cursor-pointer border"
                  />
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-gray-700">Description (optional)</span>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[70px]"
                  value={houseForm.description}
                  onChange={(e) => setHouseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={houseForm.is_active}
                  onChange={(e) => setHouseForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                <span className="text-gray-700">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setShowHouseModal(false)}
                className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveHouse}
                disabled={houseSaving}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {houseSaving ? 'Saving...' : editingHouse ? 'Save changes' : 'Create house'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
