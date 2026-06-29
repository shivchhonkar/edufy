'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FiBook, 
  FiCalendar, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle,
  FiDownload,
  FiFileText,
  FiImage,
  FiVideo,
  FiSend,
  FiX
} from 'react-icons/fi';

interface Homework {
  id: number;
  title: string;
  description: string;
  subject_name: string;
  class_name: string;
  due_date: string;
  assigned_date: string;
  total_marks: number;
  assigned_by_name: string;
  attachments: any[];
  status: string;
  submission_id: number | null;
  submission_text: string | null;
  submission_file: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  submission_status: string | null;
  graded_at: string | null;
}

export default function HomeworkPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }

    fetchHomework();
  }, [studentId, router]);

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/parent/homework?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setHomework(data.data);
      } else {
        console.error('Error fetching homework:', data.error);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = (hw: Homework) => {
    setSelectedHomework(hw);
    setSubmissionText(hw.submission_text || '');
    setShowSubmitModal(true);
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setSelectedHomework(null);
    setSubmissionText('');
  };

  const handleSubmitHomework = async () => {
    if (!selectedHomework || !submissionText.trim()) {
      alert('Please enter your homework submission');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/parent/homework/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          submission_id: selectedHomework.submission_id,
          submission_text: submissionText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Homework submitted successfully!');
        handleCloseSubmitModal();
        fetchHomework(); // Refresh the list
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error submitting homework:', error);
      alert('Failed to submit homework. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHomework = homework.filter((hw) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return hw.submission_status === 'pending';
    if (filter === 'submitted') return hw.submission_status === 'submitted';
    if (filter === 'graded') return hw.submission_status === 'graded';
    return true;
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'graded': return <FiCheckCircle className="text-green-600" />;
      case 'submitted': return <FiClock className="text-blue-600" />;
      case 'pending': return <FiAlertCircle className="text-yellow-600" />;
      default: return <FiAlertCircle className="text-gray-600" />;
    }
  };

  const isOverdue = (dueDate: string, submissionStatus: string | null) => {
    return new Date(dueDate) < new Date() && submissionStatus === 'pending';
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('image')) return <FiImage className="text-blue-600" />;
    if (type?.includes('video')) return <FiVideo className="text-purple-600" />;
    return <FiFileText className="text-red-600" />;
  };

  const stats = {
    total: homework.length,
    pending: homework.filter(h => h.submission_status === 'pending').length,
    submitted: homework.filter(h => h.submission_status === 'submitted').length,
    graded: homework.filter(h => h.submission_status === 'graded').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl text-gray-900 mb-2">Homework & Assignments</h1>
          <p className="text-gray-600">View and track your child's homework assignments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Assignments</p>
                <p className="text-xl text-gray-900 mt-1">{stats.total}</p>
              </div>
              <FiBook className="text-blue-600 text-3xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <FiAlertCircle className="text-yellow-600 text-3xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-xl text-blue-600 mt-1">{stats.submitted}</p>
              </div>
              <FiClock className="text-blue-600 text-3xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Graded</p>
                <p className="text-xl text-green-600 mt-1">{stats.graded}</p>
              </div>
              <FiCheckCircle className="text-green-600 text-3xl" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-[10px] font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('submitted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'submitted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Submitted ({stats.submitted})
            </button>
            <button
              onClick={() => setFilter('graded')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'graded'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Graded ({stats.graded})
            </button>
          </div>
        </div>

        {/* Homework List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No homework assignments found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredHomework.map((hw) => (
              <div
                key={hw.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
                  isOverdue(hw.due_date, hw.submission_status) ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <FiBook className="text-blue-600 text-2xl mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="text-xl  text-gray-900 mb-1">{hw.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span className="font-medium">{hw.subject_name}</span>
                            <span>•</span>
                            <span>{hw.class_name}</span>
                            {hw.assigned_by_name && (
                              <>
                                <span>•</span>
                                <span>By {hw.assigned_by_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                      {getStatusIcon(hw.submission_status)}
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(hw.submission_status)}`}>
                        {hw.submission_status || 'Not Assigned'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{hw.description}</p>
                  </div>

                  {/* Attachments */}
                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {hw.attachments.map((file: any, index: number) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                          >
                            {getFileIcon(file.type)}
                            <span className="text-sm text-gray-700">{file.filename}</span>
                            <FiDownload className="text-gray-500 text-sm" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-gray-400" />
                      <span className="text-gray-600">
                        Due: <span className={isOverdue(hw.due_date, hw.submission_status) ? 'text-red-600 font-medium' : 'font-medium text-gray-900'}>
                          {new Date(hw.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {isOverdue(hw.due_date, hw.submission_status) && (
                          <span className="ml-2 text-red-600 font-medium">(Overdue)</span>
                        )}
                      </span>
                    </div>
                    {hw.total_marks && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          Total Marks: <span className="font-medium text-gray-900">{hw.total_marks}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submission Info */}
                  {hw.submission_status === 'submitted' && hw.submitted_at && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">Submitted</p>
                      <p className="text-sm text-blue-700">
                        Submitted on {new Date(hw.submitted_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                  {/* Grading Info */}
                  {hw.submission_status === 'graded' && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-green-900">Graded</p>
                        <p className="text-lg font-bold text-green-900">
                          {hw.marks_obtained} / {hw.total_marks}
                        </p>
                      </div>
                      {hw.feedback && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-green-900 mb-1">Teacher's Feedback:</p>
                          <p className="text-sm text-green-700 whitespace-pre-wrap">{hw.feedback}</p>
                        </div>
                      )}
                      {hw.graded_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Graded on {new Date(hw.graded_at).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit Button - Only show for pending assignments */}
                  {hw.submission_status === 'pending' && hw.submission_id && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleOpenSubmitModal(hw)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                      >
                        <FiSend size={18} />
                        Submit Homework
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submission Modal */}
        {showSubmitModal && selectedHomework && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl text-gray-900">Submit Homework</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedHomework.title}</p>
                  </div>
                  <button
                    onClick={handleCloseSubmitModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Homework Details */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiBook className="text-blue-600" />
                    <span className="font-medium text-gray-900">{selectedHomework.subject_name}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{selectedHomework.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Due: {new Date(selectedHomework.due_date).toLocaleDateString('en-IN')}</span>
                    {selectedHomework.total_marks && (
                      <span>Marks: {selectedHomework.total_marks}</span>
                    )}
                  </div>
                </div>

                {/* Submission Form */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Write your homework answer here...

Tips:
- Be clear and concise
- Show your work/calculations
- Answer all parts of the question
- Check your spelling and grammar"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Character count: {submissionText.length}
                  </p>
                </div>

                {/* Info Box */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="text-blue-600 mt-1 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Before submitting:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Review your answer carefully</li>
                        <li>Make sure you've answered all questions</li>
                        <li>Check for any errors</li>
                        <li>You can edit and resubmit if needed before the teacher grades it</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseSubmitModal}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitHomework}
                    disabled={submitting || !submissionText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiSend size={18} />
                        Submit Homework
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

