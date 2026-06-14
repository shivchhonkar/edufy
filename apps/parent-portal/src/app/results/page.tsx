'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiAward, 
  FiTrendingUp, 
  FiTrendingDown,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiBook,
  FiFilter,
  FiDownload
} from 'react-icons/fi';

interface ExamResult {
  id: number;
  exam_name: string;
  exam_type: string;
  exam_date: string;
  subject_name: string;
  class_name: string;
  marks_obtained: number;
  total_marks: number;
  passing_marks: number;
  percentage: number;
  grade: string;
  result_status: string;
  is_absent: boolean;
  remarks: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    // Get user data to get all children
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.children && user.children.length > 0) {
      setChildren(user.children);
      
      // Try to get pre-selected child
      const storedChildId = localStorage.getItem('selectedChildId');
      const storedChild = localStorage.getItem('selectedChild');
      
      if (storedChildId && storedChild) {
        setSelectedChildId(parseInt(storedChildId));
        setSelectedChild(JSON.parse(storedChild));
        fetchResults(parseInt(storedChildId));
      } else {
        // Auto-select first child
        const firstChild = user.children[0];
        setSelectedChildId(firstChild.id);
        setSelectedChild(firstChild);
        localStorage.setItem('selectedChildId', firstChild.id.toString());
        localStorage.setItem('selectedChild', JSON.stringify(firstChild));
        fetchResults(firstChild.id);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, filterType, filterSubject]);

  const fetchResults = async (studentId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/results?studentId=${studentId}`);
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (childId: number) => {
    const child = children.find(c => c.id === childId);
    if (child) {
      setSelectedChildId(childId);
      setSelectedChild(child);
      localStorage.setItem('selectedChildId', childId.toString());
      localStorage.setItem('selectedChild', JSON.stringify(child));
      fetchResults(childId);
    }
  };

  const filterResults = () => {
    let filtered = [...results];

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.exam_type === filterType);
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter(r => r.subject_name === filterSubject);
    }

    setFilteredResults(filtered);
  };

  const getSubjects = () => {
    const subjects = new Set(results.map(r => r.subject_name));
    return Array.from(subjects);
  };

  const calculateStats = () => {
    const totalExams = filteredResults.length;
    const passedExams = filteredResults.filter(r => r.result_status === 'Pass').length;
    const failedExams = filteredResults.filter(r => r.result_status === 'Fail').length;
    const absentExams = filteredResults.filter(r => r.is_absent).length;
    const avgPercentage = totalExams > 0 
      ? (filteredResults.reduce((sum, r) => sum + r.percentage, 0) / totalExams).toFixed(2)
      : '0.00';

    return { totalExams, passedExams, failedExams, absentExams, avgPercentage };
  };

  const stats = calculateStats();

  const getGradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'bg-green-100 text-green-800';
    if (['B+', 'B'].includes(grade)) return 'bg-blue-100 text-blue-800';
    if (['C'].includes(grade)) return 'bg-yellow-100 text-yellow-800';
    if (['D'].includes(grade)) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-12 text-center max-w-md">
          <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl  text-gray-900 mb-2">No Children Found</h2>
          <p className="text-gray-500">
            No children are associated with your account. Please contact the school administration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-xl text-gray-900">Exam Results</h1>
              {selectedChild && (
                <p className="text-gray-600 mt-1">
                  {selectedChild.first_name} {selectedChild.last_name} - {selectedChild.class_name}
                </p>
              )}
            </div>
            
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="flex items-center gap-3">
                <label htmlFor="child-select" className="text-sm font-medium text-gray-700">
                  Select Child:
                </label>
                <select
                  id="child-select"
                  value={selectedChildId || ''}
                  onChange={(e) => handleChildChange(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name} - {child.class_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <FiAward className="text-blue-600 text-5xl" />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Exams</p>
                <p className="text-xl text-gray-900 mt-1">{stats.totalExams}</p>
              </div>
              <FiBook className="text-blue-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-xl text-green-600 mt-1">{stats.passedExams}</p>
              </div>
              <FiCheckCircle className="text-green-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-xl text-red-600 mt-1">{stats.failedExams}</p>
              </div>
              <FiXCircle className="text-red-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-xl text-orange-600 mt-1">{stats.absentExams}</p>
              </div>
              <FiCalendar className="text-orange-600 text-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg %</p>
                <p className="text-xl text-blue-600 mt-1">{stats.avgPercentage}%</p>
              </div>
              <FiTrendingUp className="text-blue-600 text-2xl" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Exam Types</option>
              <option value="midterm">Mid-Term</option>
              <option value="final">Final</option>
              <option value="unit_test">Unit Test</option>
              <option value="quiz">Quiz</option>
              <option value="monthly">Monthly Test</option>
            </select>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Subjects</option>
              {getSubjects().map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No exam results available</p>
            <p className="text-gray-400 text-sm mt-2">Results will appear here once uploaded by the school</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <div key={result.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl  text-gray-900">{result.exam_name}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                        {result.exam_type.replace('_', ' ')}
                      </span>
                      {result.is_absent ? (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                          Absent
                        </span>
                      ) : (
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getGradeColor(result.grade)}`}>
                          Grade: {result.grade}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Subject</p>
                        <p className="text-sm font-medium text-gray-900">{result.subject_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Exam Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(result.exam_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Marks Obtained</p>
                        <p className="text-sm font-medium text-gray-900">
                          {result.is_absent ? 'Absent' : `${result.marks_obtained} / ${result.total_marks}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Percentage</p>
                        <p className="text-sm font-medium text-gray-900">{result.percentage}%</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {result.result_status === 'Pass' ? (
                          <>
                            <FiCheckCircle className="text-green-600" />
                            <span className="text-sm font-medium text-green-600">Passed</span>
                          </>
                        ) : result.is_absent ? (
                          <>
                            <FiCalendar className="text-orange-600" />
                            <span className="text-sm font-medium text-orange-600">Absent</span>
                          </>
                        ) : (
                          <>
                            <FiXCircle className="text-red-600" />
                            <span className="text-sm font-medium text-red-600">Failed</span>
                          </>
                        )}
                      </div>
                      {!result.is_absent && (
                        <div className="flex-1 max-w-xs">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                result.percentage >= 90 ? 'bg-green-500' :
                                result.percentage >= 70 ? 'bg-blue-500' :
                                result.percentage >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(result.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {result.remarks && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Remarks</p>
                        <p className="text-sm text-gray-700 mt-1">{result.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


