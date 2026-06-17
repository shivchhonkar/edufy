'use client';

import { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import FeesPageHeader from '@/features/fees/components/FeesPageHeader';

interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function FeeCategoriesPage() {
  const { alert } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fees/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fees/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setDescription('');
        await load();
        await alert('Category created', { title: 'Success', type: 'success' });
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <FeesPageHeader
        title="Fee Categories"
        description="Group fee types for reporting and structure organization."
      />

      <form
        onSubmit={handleCreate}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
      >
        <h2 className="text-sm font-semibold text-gray-900">Add Category</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name (e.g. Tuition)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <FiPlus size={16} />
          {saving ? 'Saving...' : 'Add Category'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {loading ? (
          <p className="p-8 text-center text-gray-500 text-sm">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">No categories yet</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="px-5 py-4 flex justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{cat.name}</p>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                )}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full h-fit ${
                  cat.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
