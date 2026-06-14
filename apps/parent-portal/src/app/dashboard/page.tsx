'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiDollarSign, FiCalendar, FiBook, FiVideo, FiFileText } from 'react-icons/fi';
import { StatCard } from '@EduLakhya/ui';
import { formatCurrency } from '@EduLakhya/utils';

// Icon mapping
const iconMap: any = {
  FiDollarSign,
  FiCalendar,
  FiBook,
  FiUser,
  FiVideo,
  FiFileText,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingHomework, setPendingHomework] = useState<any[]>([]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.children && parsedUser.children.length > 0) {
        // Check if there's a previously selected child
        const savedChildId = localStorage.getItem('selectedChildId');
        let childToSelect = parsedUser.children[0]; // Default to first child

        // If there's a saved child ID, find that child
        if (savedChildId) {
          const savedChild = parsedUser.children.find(
            (child: any) => child.id.toString() === savedChildId
          );
          if (savedChild) {
            childToSelect = savedChild;
          }
        }

        setSelectedChild(childToSelect);
        fetchChildStats(childToSelect.id);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const fetchChildStats = async (studentId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/stats?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }

      // Fetch pending homework
      const homeworkResponse = await fetch(`/api/homework?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const homeworkData = await homeworkResponse.json();
      if (homeworkData.success) {
        // Filter only pending homework
        const pending = homeworkData.data.filter((hw: any) => hw.submission_status === 'pending');
        setPendingHomework(pending);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (child: any) => {
    setSelectedChild(child);
    // Save the selected child ID to localStorage for persistence
    localStorage.setItem('selectedChildId', child.id.toString());
    
    // Trigger a custom event to notify other components (like Sidebar)
    window.dispatchEvent(new CustomEvent('childSelected', { 
      detail: { childId: child.id.toString() } 
    }));
    
    fetchChildStats(child.id);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Children */}
        <section className="mb-8">
          <h2 className="text-xl text-gray-900 mb-4">My Children</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.children?.map((child: any) => (
              <div
                key={child.id}
                onClick={() => handleChildChange(child)}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all cursor-pointer ${
                  selectedChild?.id === child.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    {child.photo_url ? (
                      <img
                        src={child.photo_url}
                        alt={`${child.first_name} ${child.last_name}`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {child.first_name} {child.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {child.class_name} (Roll: {child.roll_number || 'N/A'})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {child.admission_number}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedChild && (
          <>
            {/* Quick Stats */}
            <section className="mb-8">
              <h2 className="text-xl text-gray-900 mb-4">
                Quick Overview - {selectedChild.first_name}
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div 
                    onClick={() => router.push(`/attendance/${selectedChild.id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <StatCard
                      title="Attendance This Month"
                      value={stats?.attendance?.percentage || '0%'}
                      icon={FiCalendar}
                      color="green"
                      trend={stats?.attendance?.trend}
                    />
                  </div>
                  <div 
                    onClick={() => router.push(`/fees/${selectedChild.id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <StatCard
                      title="Pending Fees"
                      value={formatCurrency(stats?.fees?.pending || 0)}
                      icon={FiDollarSign}
                      color="red"
                    />
                  </div>
                  <div 
                    onClick={() => router.push(`/homework/${selectedChild.id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <StatCard
                      title="Pending Homework"
                      value={stats?.homework?.pending || 0}
                      icon={FiBook}
                      color="yellow"
                    />
                  </div>
                  <div 
                    onClick={() => router.push(`/grades/${selectedChild.id}`)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <StatCard
                      title="Overall Grade"
                      value={stats?.grades?.overall || 'N/A'}
                      icon={FiFileText}
                      color="purple"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Pending Homework */}
            {pendingHomework.length > 0 && (
              <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl text-gray-900">Pending Homework</h2>
                  <button
                    onClick={() => router.push(`/homework/${selectedChild.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingHomework.slice(0, 4).map((hw: any) => (
                    <HomeworkCard 
                      key={hw.id} 
                      homework={hw}
                      studentId={selectedChild.id}
                      onSubmit={() => fetchChildStats(selectedChild.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section className="mb-8">
              <h2 className="text-xl text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <QuickActionCard
                  title="View Report Card"
                  description="Check academic performance and grades"
                  icon={FiFileText}
                  color="blue"
                  onClick={() => router.push(`/grades/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Pay Fees"
                  description="View and pay pending fees online"
                  icon={FiDollarSign}
                  color="green"
                  onClick={() => router.push(`/fees/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="View Attendance"
                  description="Check daily attendance records"
                  icon={FiCalendar}
                  color="purple"
                  onClick={() => router.push(`/attendance/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Homework"
                  description="View and submit homework assignments"
                  icon={FiBook}
                  color="yellow"
                  onClick={() => router.push(`/homework/${selectedChild.id}`)}
                />
                <QuickActionCard
                  title="Join Online Classes"
                  description="Access live class sessions"
                  icon={FiVideo}
                  color="red"
                  onClick={() => alert('Online classes feature coming soon!')}
                />
                <QuickActionCard
                  title="Download Documents"
                  description="Access receipts and reports"
                  icon={FiFileText}
                  color="indigo"
                  onClick={() => router.push(`/profile/${selectedChild.id}?tab=documents`)}
                />
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-xl text-gray-900 mb-4">Recent Activity</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="divide-y">
                    {stats.recentActivity.map((activity: any, index: number) => (
                      <ActivityItem 
                        key={index} 
                        {...activity} 
                        icon={iconMap[activity.iconName] || FiFileText}
                        onClick={
                          activity.title?.includes('Homework')
                            ? () => router.push(`/homework/${selectedChild.id}`)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No recent activity found
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  description: string;
  icon: any;
  color: string;
  onClick?: () => void;
}) {
  const colorClasses: any = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
  };

  const iconColors: any = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
  };

  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${colorClasses[color]}`}
    >
      <Icon className={`w-8 h-8 mb-3 ${iconColors[color]}`} />
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function ActivityItem({
  title,
  description,
  time,
  icon: Icon,
  iconColor,
  iconBg,
  onClick,
}: {
  title: string;
  description: string;
  time: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className={`p-4 flex items-start space-x-4 hover:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function HomeworkCard({ 
  homework, 
  studentId, 
  onSubmit 
}: { 
  homework: any; 
  studentId: number;
  onSubmit: () => void;
}) {
  const router = useRouter();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOverdue = new Date(homework.due_date) < new Date();

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      alert('Please enter your homework answer');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/homework/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          submission_id: homework.submission_id,
          submission_text: submissionText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Homework submitted successfully!');
        setShowSubmitModal(false);
        setSubmissionText('');
        onSubmit();
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

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-300' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{homework.title}</h3>
            <p className="text-sm text-gray-600">{homework.subject_name}</p>
          </div>
          {isOverdue && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
              Overdue
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{homework.description}</p>
        
        <div className="flex items-center text-xs text-gray-500 mb-3">
          <FiCalendar className="mr-1" />
          Due: {new Date(homework.due_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
          {homework.total_marks && (
            <span className="ml-3">• {homework.total_marks} marks</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/homework/${studentId}`)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            View Details
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Submit Now
          </button>
        </div>
      </div>

      {/* Quick Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Submit Homework</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <p className="font-medium text-gray-900">{homework.title}</p>
                <p className="text-sm text-gray-600">{homework.subject_name}</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer *
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Write your homework answer here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Characters: {submissionText.length}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !submissionText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Homework'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


