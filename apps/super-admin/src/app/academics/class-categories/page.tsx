'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import AppModal, { AppModalShell, APP_MODAL_BODY } from '@/shared/components/common/AppModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/shared/context/DialogContext';
import { sortClassesByName } from '@/lib/class-sort';
import { FiEdit2, FiFolder, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

type SchoolClass = { id: number; name: string };
type CategoryClass = { id: number; name: string };

type ClassCategory = {
  id: number;
  name: string;
  report_card_format: number;
  is_active: boolean;
  class_count: number;
  classes: CategoryClass[];
};

const EMPTY_FORM = {
  name: '',
  report_card_format: '0',
  class_ids: [] as number[],
};

export default function ClassCategoriesPage() {
  const { alert, confirm } = useDialog();
  const [categories, setCategories] = useState<ClassCategory[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassCategory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [classSearch, setClassSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, classRes] = await Promise.all([
        fetch('/api/academics/class-categories'),
        fetch('/api/classes?active_only=true'),
      ]);
      const [catData, classData] = await Promise.all([catRes.json(), classRes.json()]);
      if (catData.success) {
        setCategories(
          (catData.data || []).map((row: ClassCategory) => ({
            ...row,
            classes: Array.isArray(row.classes) ? row.classes : [],
          })),
        );
      }
      if (classData.success) setClasses(sortClassesByName(classData.data || []));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const classById = useMemo(() => {
    const map = new Map<number, SchoolClass>();
    for (const cls of classes) map.set(cls.id, cls);
    return map;
  }, [classes]);

  const assignedElsewhere = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of categories) {
      if (editing && category.id === editing.id) continue;
      for (const cls of category.classes || []) {
        map.set(cls.id, category.name);
      }
    }
    return map;
  }, [categories, editing]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((cls) => cls.name.toLowerCase().includes(q));
  }, [classes, classSearch]);

  const selectedClassNames = form.class_ids
    .map((id) => classById.get(id)?.name)
    .filter(Boolean)
    .join(', ');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setClassSearch('');
    setShowModal(true);
  };

  const openEdit = (category: ClassCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      report_card_format: String(category.report_card_format ?? 0),
      class_ids: (category.classes || []).map((cls) => cls.id),
    });
    setClassSearch('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setClassSearch('');
  };

  const toggleClass = (classId: number) => {
    setForm((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      await alert('Category name is required', { title: 'Validation Error' });
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/academics/class-categories/${editing.id}`
        : '/api/academics/class-categories';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          report_card_format: parseInt(form.report_card_format || '0', 10) || 0,
          class_ids: form.class_ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        await loadData();
        await alert(editing ? 'Category updated' : 'Category created', {
          title: 'Success',
          type: 'success',
        });
      } else {
        await alert(data.error || 'Failed to save category', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      await alert('Failed to save category', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ClassCategory) => {
    const ok = await confirm(`Delete category "${category.name}"? Assigned classes will be unlinked.`, {
      title: 'Delete Category',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/academics/class-categories/${category.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadData();
        await alert('Category deleted', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error || 'Failed to delete category', { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      await alert('Failed to delete category', { title: 'Error', type: 'error' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Class Categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Group classes such as Primary, Middle, or Senior Secondary.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <FiPlus size={16} />
            Add Category
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Classes
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Report Card Format
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-gray-500">
                      Loading categories…
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-gray-500">
                      No class categories yet. Create Primary, Middle, Senior, and assign classes.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <FiFolder className="text-primary-600" />
                          <span className="font-medium text-gray-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {category.classes?.length
                          ? category.classes.map((cls) => cls.name).join(', ')
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{category.report_card_format ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(category)}
                            className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50"
                            title="Edit"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AppModal open={showModal} onClose={closeModal}>
          <AppModalShell
            header={
              <>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Edit Class Category' : 'Add Class Category'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close"
                >
                  <FiX size={20} />
                </button>
              </>
            }
            footer={
              <>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            }
          >
            <div className={`${APP_MODAL_BODY} p-4 sm:p-6`}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Primary, Middle, Senior"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Classes</label>
                    <textarea
                      readOnly
                      rows={5}
                      value={selectedClassNames}
                      placeholder="Select classes from the list"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {form.class_ids.length} class{form.class_ids.length === 1 ? '' : 'es'} selected
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Report Card Format</label>
                    <input
                      type="number"
                      min={0}
                      value={form.report_card_format}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, report_card_format: e.target.value }))
                      }
                      className="w-full max-w-[8rem] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                <div className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-gray-200">
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                    Select classes
                  </div>
                  <div className="relative border-b border-gray-100 px-3 py-2">
                    <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Search class"
                      className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredClasses.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-gray-500">No classes found</p>
                    ) : (
                      filteredClasses.map((cls) => {
                        const checked = form.class_ids.includes(cls.id);
                        const otherCategory = assignedElsewhere.get(cls.id);
                        return (
                          <label
                            key={cls.id}
                            className={`flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2 text-sm hover:bg-primary-50/40 ${
                              checked ? 'bg-primary-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleClass(cls.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="min-w-0 flex-1 font-medium text-gray-900">{cls.name}</span>
                            {otherCategory && (
                              <span className="shrink-0 text-[11px] text-amber-700">
                                In {otherCategory}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AppModalShell>
        </AppModal>
      </div>
    </DashboardLayout>
  );
}
