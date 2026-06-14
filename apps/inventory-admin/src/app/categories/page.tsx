'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiTag } from 'react-icons/fi';
import { Button } from '@EduLakhya/ui';
import Link from 'next/link';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category: any = null) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"?\n\nNote: You can only delete categories that have no items.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, { 
        method: 'DELETE' 
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Category deleted successfully!');
        fetchCategories();
      } else {
        alert(`Failed to delete category:\n\n${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl text-gray-900">Item Categories</h1>
              <p className="text-sm text-gray-600">Manage inventory categories</p>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Button onClick={() => openModal()}>
                <FiPlus className="mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiTag className="text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(category)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit category"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete category"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl mb-4">
            {category ? 'Edit Category' : 'Add New Category'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Category'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


