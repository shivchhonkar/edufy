'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiX } from 'react-icons/fi';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'public' | 'school' | 'national' | 'festival';
  description?: string;
}

interface EditHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  holiday: Holiday | null;
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  return dateStr.split('T')[0];
};

export default function EditHolidayModal({ isOpen, onClose, onSuccess, holiday }: EditHolidayModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'public' as 'public' | 'school' | 'national' | 'festival',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (holiday) {
      setFormData({
        date: formatDateForInput(holiday.date),
        name: holiday.name || '',
        type: holiday.type || 'public',
        description: holiday.description || '',
      });
    }
    setError('');
  }, [holiday, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.date || !formData.name || !formData.type) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/holidays/${holiday?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to update holiday');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sidebarCollapsed = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  }, [isOpen]);

  if (!isOpen || !holiday) return null;

  return (
    <div className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-[60] transition-all duration-300 ${
      sidebarCollapsed ? 'left-16' : 'left-56'
    }`} style={{ width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 224px)' }}>
      <div className="bg-white shadow-2xl w-full h-full overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl text-gray-900">Edit Holiday</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holiday Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Republic Day"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="public">Public</option>
              <option value="school">School</option>
              <option value="national">National</option>
              <option value="festival">Festival</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the holiday"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Updating...' : 'Update Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}









