'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import { 
  FiBook, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiEye, 
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiFilter,
  FiX
} from 'react-icons/fi';

interface Homework {
  id: number;
  title: string;
  description: string;
  class_name: string;
  subject_name: string;
  due_date: string;
  total_marks: number;
  total_submissions: number;
  submitted_count: number;
  graded_count: number;
  status: string;
  assigned_by_name: string;
}

export default function HomeworkPage() {
  const { alert, confirm } = useDialog();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchHomework();
    fetchClasses();
    fetchSubjects();
  }, [filterClass, filterSubject, filterStatus, search]);

  const fetchHomework = async () => {
    try {
      let url = '/api/homework?';
      const params = [];
      if (filterClass) params.push(`class_id=${filterClass}`);
      if (filterSubject) params.push(`subject_id=${filterSubject}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (search) params.push(`search=${search}`);
      
      url += params.join('&');

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setHomework(data.data);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleViewSubmissions = async (hw: Homework) => {
    try {
      const res = await fetch(`/api/homework/${hw.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedHomework(data.data);
        setSubmissions(data.data.submissions || []);
        setShowSubmissionsModal(true);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this homework?', {
      title: 'Delete Homework',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchHomework();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting homework:', error);
      await alert('Failed to delete homework', { title: 'Error', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl text-gray-900">Homework & Assignments</h1>
            <p className="text-gray-600 mt-1">Manage homework and track submissions</p>
          </div>
          <button 
            onClick={() => {
              setSelectedHomework(null);
              setShowModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <FiPlus />
            <span>Assign Homework</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search homework..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {(search || filterClass || filterSubject || filterStatus) && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {search && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                    Search: "{search}"
                  </span>
                )}
                {filterClass && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Class: {classes.find(c => c.id.toString() === filterClass)?.name}
                  </span>
                )}
                {filterSubject && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    Subject: {subjects.find(s => s.id.toString() === filterSubject)?.name}
                  </span>
                )}
                {filterStatus && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterClass('');
                  setFilterSubject('');
                  setFilterStatus('');
                }}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={16} />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Homework List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">Loading homework...</p>
          </div>
        ) : homework.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center flex-col py-12">
              <FiBook className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-500">No homework found</p>
              <p className="text-sm text-gray-400 mt-2">
                {search || filterClass || filterSubject ? 
                  'Try adjusting your filters' : 
                  'Click "Assign Homework" to get started'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homework.map((hw) => (
              <div key={hw.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg text-gray-900 mb-1">{hw.title}</h3>
                      <p className="text-sm text-gray-600">{hw.class_name} • {hw.subject_name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hw.status)}`}>
                      {hw.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{hw.description}</p>

                  {/* Due Date */}
                  <div className={`flex items-center text-sm mb-4 ${
                    isOverdue(hw.due_date) && hw.status === 'active' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <FiClock className="mr-2" />
                    <span>
                      Due: {new Date(hw.due_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {isOverdue(hw.due_date) && hw.status === 'active' && (
                      <span className="ml-2 text-xs font-medium">(Overdue)</span>
                    )}
                  </div>

                  {/* Submission Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-lg text-gray-900">{hw.total_submissions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Submitted</p>
                      <p className="text-lg text-blue-600">{hw.submitted_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Graded</p>
                      <p className="text-lg text-green-600">{hw.graded_count}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleViewSubmissions(hw)}
                      className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-800"
                    >
                      <FiEye size={16} />
                      <span>View Submissions</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedHomework(hw);
                          setShowModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(hw.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <HomeworkModal
          homework={selectedHomework}
          classes={classes}
          subjects={subjects}
          onClose={() => {
            setShowModal(false);
            setSelectedHomework(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setSelectedHomework(null);
            fetchHomework();
          }}
        />
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedHomework && (
        <SubmissionsModal
          homework={selectedHomework}
          submissions={submissions}
          onClose={() => {
            setShowSubmissionsModal(false);
            setSelectedHomework(null);
            setSubmissions([]);
          }}
          onRefresh={() => handleViewSubmissions(selectedHomework)}
        />
      )}
    </DashboardLayout>
  );
}

// Homework Modal Component
function HomeworkModal({ homework, classes, subjects, onClose, onSuccess }: any) {
  const { alert } = useDialog();
  const [formData, setFormData] = useState({
    class_id: homework?.class_id || '',
    subject_id: homework?.subject_id || '',
    title: homework?.title || '',
    description: homework?.description || '',
    due_date: homework?.due_date?.split('T')[0] || '',
    total_marks: homework?.total_marks || 100,
    status: homework?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<any[]>(homework?.attachments || []);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setAttachments((prev) => [...prev, data.data]);
        } else {
          await alert(`Failed to upload ${file.name}: ${data.error}`, { title: 'Upload Failed', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      await alert('Failed to upload files', { title: 'Error', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = homework ? `/api/homework/${homework.id}` : '/api/homework';
      const method = homework ? 'PUT' : 'POST';
      
      const payload: any = { ...formData };
      if (!homework) {
        payload.assigned_by = 1; // TODO: Get from session
      }
      if (attachments.length > 0) {
        payload.attachments = attachments;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving homework:', error);
      await alert('Failed to save homework', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl text-gray-900">
              {homework ? 'Edit Homework' : 'Assign New Homework'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Math Assignment - Chapter 5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter homework description and instructions..."
              required
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (PDF, Images, Videos)
            </label>
            <div className="mt-2">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Images (JPEG, PNG, GIF), Videos (MP4, MOV) up to 50MB
                  </p>
                  {uploading && <p className="text-sm text-primary-600 mt-2">Uploading...</p>}
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.mpeg,.webm"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {file.type?.includes('image') && (
                        <img src={file.url} alt={file.filename} className="w-10 h-10 object-cover rounded" />
                      )}
                      {file.type?.includes('video') && (
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      )}
                      {file.type?.includes('pdf') && (
                        <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : homework ? 'Update Homework' : 'Assign Homework'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Submissions Modal Component
function SubmissionsModal({ homework, submissions, onClose, onRefresh }: any) {
  const { alert } = useDialog();
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  const handleGrade = async (submission: any) => {
    setGrading(true);
    try {
      const res = await fetch(`/api/homework/submissions/${submission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks_obtained: parseInt(marks),
          feedback,
          graded_by: 1, // TODO: Get from session
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGradingSubmission(null);
        setMarks('');
        setFeedback('');
        onRefresh();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      await alert('Failed to grade submission', { title: 'Error', type: 'error' });
    } finally {
      setGrading(false);
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubmissionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock className="text-yellow-600" />;
      case 'submitted': return <FiCheckCircle className="text-blue-600" />;
      case 'graded': return <FiCheckCircle className="text-green-600" />;
      default: return <FiXCircle className="text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl text-gray-900">{homework.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {homework.class_name} • {homework.subject_name} • Due: {new Date(homework.due_date).toLocaleDateString()}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-600">
                  Total Marks: <span className="font-semibold">{homework.total_marks}</span>
                </span>
                <span className="text-sm text-gray-600">
                  Submissions: <span className="font-semibold">{submissions.length}</span>
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.admission_number} {submission.roll_number && `• Roll: ${submission.roll_number}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getSubmissionStatusIcon(submission.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSubmissionStatusColor(submission.status)}`}>
                            {submission.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleString('en-IN')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.marks_obtained !== null ? (
                          <span className="text-sm font-semibold text-gray-900">
                            {submission.marks_obtained}/{homework.total_marks}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not graded</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {submission.status === 'submitted' || submission.status === 'graded' ? (
                          <button
                            onClick={() => {
                              setGradingSubmission(submission);
                              setMarks(submission.marks_obtained?.toString() || '');
                              setFeedback(submission.feedback || '');
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            {submission.status === 'graded' ? 'Re-grade' : 'Grade'}
                          </button>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Grading Form */}
        {gradingSubmission && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Grade Submission - {gradingSubmission.first_name} {gradingSubmission.last_name}
            </h3>
            
            {gradingSubmission.submission_text && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Submission:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{gradingSubmission.submission_text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  min="0"
                  max={homework.total_marks}
                  placeholder={`Out of ${homework.total_marks}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback for student..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setGradingSubmission(null);
                  setMarks('');
                  setFeedback('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGrade(gradingSubmission)}
                disabled={!marks || grading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {grading ? 'Grading...' : 'Submit Grade'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
