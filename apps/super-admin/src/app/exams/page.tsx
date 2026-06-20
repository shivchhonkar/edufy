'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { useDialog } from '@/shared/context/DialogContext';
import UploadResultsModal from './UploadResultsModal';
import ContentAreaModal from '@/shared/components/common/ContentAreaModal';
import PublishWorkflow from '@/features/exams/components/publish-workflow';
import WorkflowBadge from '@/features/exams/components/workflow-badge';
import ResultCompilationCard from '@/features/exams/components/result-compilation-card';
import PromotionRecommendations from '@/features/exams/components/promotion-recommendations';
import RankingTable from '@/features/exams/components/ranking-table';
import ExamRawResultsTable from '@/features/exams/components/exam-raw-results-table';
import {
  FiAward, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiEye,
  FiUpload,
  FiDownload,
  FiX,
  FiSave,
  FiCalendar,
  FiBook,
  FiUsers,
  FiBarChart2,
} from 'react-icons/fi';
import type { ResultWorkflowStatus } from '@/lib/ensure-exam-result-engine';

interface SubjectMarksEntry {
  total_marks: string;
  passing_marks: string;
}

interface ExamFormState {
  name: string;
  class_id: string;
  subject_ids: string[];
  exam_type: string;
  exam_date: string;
  total_marks: string;
  passing_marks: string;
  use_same_marks: boolean;
  subject_marks: Record<string, SubjectMarksEntry>;
}

const DEFAULT_EXAM_FORM: ExamFormState = {
  name: '',
  class_id: '',
  subject_ids: [],
  exam_type: 'midterm',
  exam_date: '',
  total_marks: '100',
  passing_marks: '40',
  use_same_marks: true,
  subject_marks: {},
};

function formatExamMarksSummary(exam: Exam) {
  if (exam.subjects?.length) {
    const first = exam.subjects[0];
    const allSame = exam.subjects.every(
      (s) => s.total_marks === first.total_marks && s.passing_marks === first.passing_marks,
    );
    if (!allSame) {
      return exam.subjects
        .map((s) => `${s.subject_name}: ${s.total_marks}/${s.passing_marks}`)
        .join(' · ');
    }
  }
  return `Total: ${exam.total_marks} | Pass: ${exam.passing_marks}`;
}

function buildSubjectMarksPayload(form: ExamFormState) {
  return form.subject_ids.map((subjectId) => ({
    subject_id: parseInt(subjectId, 10),
    total_marks: parseInt(
      form.use_same_marks ? form.total_marks : form.subject_marks[subjectId]?.total_marks || form.total_marks,
      10,
    ),
    passing_marks: parseInt(
      form.use_same_marks ? form.passing_marks : form.subject_marks[subjectId]?.passing_marks || form.passing_marks,
      10,
    ),
  }));
}

interface ExamSubject {
  subject_id: number;
  subject_name: string;
  total_marks: number;
  passing_marks: number;
}

interface Exam {
  id: number;
  name: string;
  class_id: number;
  subject_id: number;
  class_name: string;
  subject_name: string;
  subject_names?: string;
  subjects?: ExamSubject[];
  subject_count?: number;
  exam_type: string;
  exam_date: string;
  total_marks: number;
  passing_marks: number;
  total_students: number;
  total_results: number;
  result_workflow_status?: ResultWorkflowStatus | string;
  last_compiled_at?: string | null;
  academic_year?: string | null;
  session_label?: string;
}

interface ClassExamSessionGroup {
  session: string;
  exams: Exam[];
}

interface ClassExamGroup {
  classId: number;
  className: string;
  sessions: ClassExamSessionGroup[];
}

function groupExamsByClassAndSession(exams: Exam[]): ClassExamGroup[] {
  const byClass = new Map<number, ClassExamGroup>();

  for (const exam of exams) {
    const session = exam.session_label || exam.academic_year || 'Unassigned Session';
    let classGroup = byClass.get(exam.class_id);
    if (!classGroup) {
      classGroup = {
        classId: exam.class_id,
        className: exam.class_name || 'Unknown Class',
        sessions: [],
      };
      byClass.set(exam.class_id, classGroup);
    }

    let sessionGroup = classGroup.sessions.find((entry) => entry.session === session);
    if (!sessionGroup) {
      sessionGroup = { session, exams: [] };
      classGroup.sessions.push(sessionGroup);
    }
    sessionGroup.exams.push(exam);
  }

  return Array.from(byClass.values())
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((classGroup) => ({
      ...classGroup,
      sessions: classGroup.sessions
        .map((sessionGroup) => ({
          ...sessionGroup,
          exams: [...sessionGroup.exams].sort(
            (a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime(),
          ),
        }))
        .sort((a, b) => b.session.localeCompare(a.session)),
    }));
}

interface ExamResult {
  id: number;
  student_id: number;
  subject_id?: number;
  subject_name?: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  admission_number: string;
  marks_obtained: number;
  grade: string;
  percentage: number;
  is_absent: boolean;
  remarks: string;
}

export default function ExamsPage() {
  const { alert, confirm } = useDialog();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);
  const [viewSummaries, setViewSummaries] = useState<
    Array<{
      student_id: number;
      first_name: string;
      last_name: string;
      percentage: number | string;
      overall_grade: string;
      result_status: string;
      class_rank: number | null;
      school_rank: number | null;
    }>
  >([]);
  const [viewResults, setViewResults] = useState<ExamResult[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [resultInputs, setResultInputs] = useState<Record<number, Record<number, { marks: string; absent: boolean; remarks: string }>>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const [examForm, setExamForm] = useState<ExamFormState>(DEFAULT_EXAM_FORM);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, classesRes, subjectsRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/classes'),
        fetch('/api/subjects'),
      ]);

      const [examsData, classesData, subjectsData] = await Promise.all([
        examsRes.json(),
        classesRes.json(),
        subjectsRes.json(),
      ]);

      if (examsData.success) setExams(examsData.data);
      if (classesData.success) setClasses(classesData.data);
      if (subjectsData.success) setSubjects(subjectsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExam = async () => {
    if (!examForm.name.trim() || !examForm.class_id || examForm.subject_ids.length === 0 || !examForm.exam_date) {
      await alert('Please fill in exam name, class, at least one subject, and exam date.', { title: 'Missing fields', type: 'warning' });
      return;
    }

    const subjectMarksPayload = buildSubjectMarksPayload(examForm);
    for (const entry of subjectMarksPayload) {
      if (!entry.total_marks || !entry.passing_marks) {
        await alert('Each selected subject must have total marks and passing marks.', { title: 'Missing marks', type: 'warning' });
        return;
      }
      if (entry.passing_marks > entry.total_marks) {
        const subject = subjects.find((s) => s.id === entry.subject_id);
        await alert(
          `Passing marks cannot exceed total marks${subject ? ` for ${subject.name}` : ''}.`,
          { title: 'Invalid marks', type: 'warning' },
        );
        return;
      }
    }

    try {
      const url = editingExam ? `/api/exams/${editingExam.id}` : '/api/exams';
      const method = editingExam ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examForm.name,
          class_id: examForm.class_id,
          subject_ids: examForm.subject_ids,
          exam_type: examForm.exam_type,
          exam_date: examForm.exam_date,
          total_marks: examForm.total_marks,
          passing_marks: examForm.passing_marks,
          subject_marks: subjectMarksPayload,
          created_by: 1, // TODO: Get from auth
        }),
      });

      const data = await response.json();
      if (data.success) {
        await alert(data.message, { title: 'Success', type: 'success' });
        setShowExamModal(false);
        setEditingExam(null);
        setExamForm(DEFAULT_EXAM_FORM);
        fetchData();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      await alert('Failed to save exam', { title: 'Error', type: 'error' });
    }
  };

  const handleDeleteExam = async (id: number) => {
    const confirmed = await confirm('Are you sure you want to delete this exam? All results will also be deleted.', {
      title: 'Delete Exam',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await alert(data.message, { title: 'Success', type: 'success' });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      await alert('Failed to delete exam', { title: 'Error', type: 'error' });
    }
  };

  const handleEditExam = async (exam: Exam) => {
    setEditingExam(exam);

    let formattedDate = '';
    if (exam.exam_date) {
      formattedDate = new Date(exam.exam_date).toISOString().split('T')[0];
    }

    let examSubjects: ExamSubject[] = exam.subjects || [];
    let subjectIds = examSubjects.map((s) => s.subject_id.toString());
    if (!subjectIds.length && exam.subject_id) {
      subjectIds = [exam.subject_id.toString()];
    }
    if (!subjectIds.length || !examSubjects.length) {
      try {
        const res = await fetch(`/api/exams/${exam.id}`);
        const data = await res.json();
        if (data.success && data.data.subjects?.length) {
          examSubjects = data.data.subjects;
          subjectIds = examSubjects.map((s: ExamSubject) => s.subject_id.toString());
        }
      } catch {
        // keep empty
      }
    }

    const subject_marks: Record<string, SubjectMarksEntry> = {};
    examSubjects.forEach((s) => {
      subject_marks[s.subject_id.toString()] = {
        total_marks: String(s.total_marks ?? exam.total_marks),
        passing_marks: String(s.passing_marks ?? exam.passing_marks),
      };
    });
    subjectIds.forEach((id) => {
      if (!subject_marks[id]) {
        subject_marks[id] = {
          total_marks: exam.total_marks.toString(),
          passing_marks: exam.passing_marks.toString(),
        };
      }
    });

    const firstSubject = examSubjects[0];
    const use_same_marks = !examSubjects.length || examSubjects.every(
      (s) =>
        s.total_marks === firstSubject.total_marks &&
        s.passing_marks === firstSubject.passing_marks,
    );

    setExamForm({
      name: exam.name,
      class_id: exam.class_id.toString(),
      subject_ids: subjectIds,
      exam_type: exam.exam_type,
      exam_date: formattedDate,
      total_marks: use_same_marks && firstSubject
        ? String(firstSubject.total_marks)
        : exam.total_marks.toString(),
      passing_marks: use_same_marks && firstSubject
        ? String(firstSubject.passing_marks)
        : exam.passing_marks.toString(),
      use_same_marks,
      subject_marks,
    });
    setShowExamModal(true);
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setExamForm((prev) => {
      const isSelected = prev.subject_ids.includes(subjectId);
      const subject_ids = isSelected
        ? prev.subject_ids.filter((id) => id !== subjectId)
        : [...prev.subject_ids, subjectId];

      const subject_marks = { ...prev.subject_marks };
      if (isSelected) {
        delete subject_marks[subjectId];
      } else {
        subject_marks[subjectId] = {
          total_marks: prev.total_marks,
          passing_marks: prev.passing_marks,
        };
      }

      return { ...prev, subject_ids, subject_marks };
    });
  };

  const updateDefaultMarks = (field: 'total_marks' | 'passing_marks', value: string) => {
    setExamForm((prev) => {
      const next = { ...prev, [field]: value };
      if (prev.use_same_marks) {
        const subject_marks = { ...prev.subject_marks };
        prev.subject_ids.forEach((id) => {
          subject_marks[id] = {
            total_marks: field === 'total_marks' ? value : subject_marks[id]?.total_marks ?? prev.total_marks,
            passing_marks: field === 'passing_marks' ? value : subject_marks[id]?.passing_marks ?? prev.passing_marks,
          };
        });
        next.subject_marks = subject_marks;
      }
      return next;
    });
  };

  const updateSubjectMarks = (
    subjectId: string,
    field: 'total_marks' | 'passing_marks',
    value: string,
  ) => {
    setExamForm((prev) => ({
      ...prev,
      subject_marks: {
        ...prev.subject_marks,
        [subjectId]: {
          total_marks: prev.subject_marks[subjectId]?.total_marks ?? prev.total_marks,
          passing_marks: prev.subject_marks[subjectId]?.passing_marks ?? prev.passing_marks,
          [field]: value,
        },
      },
    }));
  };

  const toggleUseSameMarks = (useSame: boolean) => {
    setExamForm((prev) => {
      if (useSame) {
        const subject_marks = { ...prev.subject_marks };
        prev.subject_ids.forEach((id) => {
          subject_marks[id] = {
            total_marks: prev.total_marks,
            passing_marks: prev.passing_marks,
          };
        });
        return { ...prev, use_same_marks: true, subject_marks };
      }
      return { ...prev, use_same_marks: false };
    });
  };

  const formatExamType = (type: string) => {
    const labels: Record<string, string> = {
      half_yearly: 'Half-Yearly',
      annual: 'Annual',
      midterm: 'Mid-Term',
      mid_term: 'Mid-Term',
      final: 'Final',
      unit_test: 'Unit Test',
      quiz: 'Quiz',
      monthly: 'Monthly Test',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const handleViewExam = async (exam: Exam) => {
    setViewingExam(exam);
    setShowViewModal(true);
    setViewLoading(true);
    setViewResults([]);
    setViewSummaries([]);

    try {
      const [resultsRes, summariesRes] = await Promise.all([
        fetch(`/api/exams/${exam.id}/results`),
        fetch(`/api/exams/${exam.id}/summaries`),
      ]);
      const [resultsData, summariesData] = await Promise.all([
        resultsRes.json(),
        summariesRes.json(),
      ]);
      if (resultsData.success) setViewResults(resultsData.data);
      if (summariesData.success) setViewSummaries(summariesData.data);
    } catch (error) {
      console.error('Error loading exam details:', error);
    } finally {
      setViewLoading(false);
    }
  };

  const handleUploadResults = async (exam: Exam) => {
    setLoading(true);

    try {
      const [examRes, studentsRes, resultsRes] = await Promise.all([
        fetch(`/api/exams/${exam.id}`),
        fetch(`/api/students?class_id=${exam.class_id}`),
        fetch(`/api/exams/${exam.id}/results`),
      ]);

      const [examData, studentsData, resultsData] = await Promise.all([
        examRes.json(),
        studentsRes.json(),
        resultsRes.json(),
      ]);

      const fullExam: Exam = examData.success ? examData.data : exam;
      setSelectedExam(fullExam);

      const examSubjects: ExamSubject[] = fullExam.subjects?.length
        ? fullExam.subjects
        : fullExam.subject_id
          ? [{ subject_id: fullExam.subject_id, subject_name: fullExam.subject_name, total_marks: fullExam.total_marks, passing_marks: fullExam.passing_marks }]
          : [];

      if (studentsData.success) {
        setStudents(studentsData.data);

        const inputs: Record<number, Record<number, { marks: string; absent: boolean; remarks: string }>> = {};
        studentsData.data.forEach((student: { id: number }) => {
          inputs[student.id] = {};
          examSubjects.forEach((sub) => {
            const existingResult = resultsData.data?.find(
              (r: ExamResult) => r.student_id === student.id && (r.subject_id === sub.subject_id || !r.subject_id)
            );
            inputs[student.id][sub.subject_id] = {
              marks: existingResult ? String(existingResult.marks_obtained) : '',
              absent: existingResult ? existingResult.is_absent : false,
              remarks: existingResult ? existingResult.remarks || '' : '',
            };
          });
        });
        setResultInputs(inputs);
      }

      if (resultsData.success) {
        setExamResults(resultsData.data);
      }

      setShowResultsModal(true);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResults = async () => {
    if (!selectedExam) return;

    const results: {
      student_id: number;
      subject_id: number;
      marks_obtained: number;
      is_absent: boolean;
      remarks: string;
    }[] = [];

    Object.keys(resultInputs).forEach((studentIdStr) => {
      const studentId = parseInt(studentIdStr, 10);
      Object.keys(resultInputs[studentId]).forEach((subjectIdStr) => {
        const subjectId = parseInt(subjectIdStr, 10);
        const input = resultInputs[studentId][subjectId];
        if (input.marks !== '' || input.absent) {
          results.push({
            student_id: studentId,
            subject_id: subjectId,
            marks_obtained: input.absent ? 0 : parseFloat(input.marks) || 0,
            is_absent: input.absent,
            remarks: input.remarks,
          });
        }
      });
    });

    if (results.length === 0) {
      await alert('Please enter marks for at least one student', { title: 'Notice', type: 'warning' });
      return;
    }

    try {
      const response = await fetch(`/api/exams/${selectedExam.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          uploaded_by: 1, // TODO: Get from auth
        }),
      });

      const data = await response.json();
      if (data.success) {
        await alert(data.message, { title: 'Success', type: 'success' });
        setShowResultsModal(false);
        setSelectedExam(null);
        fetchData();
      } else {
        await alert(data.error, { title: 'Error', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving results:', error);
      await alert('Failed to save results', { title: 'Error', type: 'error' });
    }
  };

  const updateResultInput = (
    studentId: number,
    subjectId: number,
    field: 'marks' | 'absent' | 'remarks',
    value: string | boolean
  ) => {
    setResultInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          ...prev[studentId]?.[subjectId],
          [field]: value,
        },
      },
    }));
  };

  const examTabs = [
    { id: 'all', label: 'All Exams', color: 'blue' },
    { id: 'half_yearly', label: 'Half-Yearly', color: 'orange' },
    { id: 'annual', label: 'Annual', color: 'teal' },
    { id: 'midterm', label: 'Mid-Term', color: 'purple' },
    { id: 'final', label: 'Final', color: 'green' },
    { id: 'unit_test', label: 'Unit Test', color: 'yellow' },
    { id: 'quiz', label: 'Quiz', color: 'pink' },
    { id: 'monthly', label: 'Monthly', color: 'indigo' },
  ];

  // Apply both filters: exam type (tab) and class
  const filteredExams = exams.filter(exam => {
    const typeMatch = activeTab === 'all' || exam.exam_type === activeTab;
    const classMatch = selectedClass === 'all' || exam.class_id.toString() === selectedClass;
    return typeMatch && classMatch;
  });

  const groupedExams = useMemo(
    () => (activeTab === 'all' ? groupExamsByClassAndSession(filteredExams) : []),
    [activeTab, filteredExams],
  );

  const getExamCountByType = (type: string) => {
    const classFilteredExams = selectedClass === 'all' 
      ? exams 
      : exams.filter(exam => exam.class_id.toString() === selectedClass);
    
    if (type === 'all') return classFilteredExams.length;
    return classFilteredExams.filter(exam => exam.exam_type === type).length;
  };

  const renderExamCard = (exam: Exam) => (
    <div key={exam.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl text-gray-900">{exam.name}</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
              {formatExamType(exam.exam_type)}
            </span>
            <WorkflowBadge status={exam.result_workflow_status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiUsers className="text-gray-400 shrink-0" />
              <span>{exam.class_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
              <FiBook className="text-gray-400 shrink-0" />
              <span className="truncate">{exam.subject_names || exam.subject_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiCalendar className="text-gray-400 shrink-0" />
              <span>{new Date(exam.exam_date).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiAward className="text-gray-400 shrink-0" />
              <span>{formatExamMarksSummary(exam)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Results: </span>
              <span className="font-semibold text-gray-900">
                {exam.total_results} / {exam.total_students} students
              </span>
            </div>
            {exam.total_results > 0 && (
              <div className="h-2 flex-1 max-w-xs bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(exam.total_results / exam.total_students) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleUploadResults(exam)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
          >
            <FiUpload /> Upload Results
          </button>
          <button
            onClick={() => handleViewExam(exam)}
            title="View exam details"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiEye />
          </button>
          <button
            onClick={() => handleEditExam(exam)}
            title="Edit exam"
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <FiEdit2 />
          </button>
          <button
            onClick={() => handleDeleteExam(exam.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
      <PublishWorkflow
        examId={exam.id}
        status={exam.result_workflow_status}
        onUpdated={fetchData}
      />
      {['annual', 'final'].includes(exam.exam_type) && (
        <PromotionRecommendations examId={exam.id} classId={String(exam.class_id)} />
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl text-gray-900">Exams & Results</h1>
            <p className="text-gray-600 mt-1">Manage exams and upload student results</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Class Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="class-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filter by Class:
              </label>
              <select
                id="class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm min-w-[150px]"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            
            <Link
              href="/exams/analytics"
              className="inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <FiBarChart2 size={16} /> Analytics
            </Link>
            {/* Create Exam Button */}
            <button
              onClick={() => {
                setEditingExam(null);
                setExamForm(DEFAULT_EXAM_FORM);
                setShowExamModal(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <FiPlus /> Create Exam
            </button>
          </div>
        </div>

        {/* Exam Type Tabs */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="flex overflow-x-auto">
            {examTabs.map((tab) => {
              const count = getExamCountByType(tab.id);
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[140px] px-6 py-4 text-center font-medium transition-all border-b-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">{tab.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedClass !== 'all' || activeTab !== 'all') && filteredExams.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-blue-900">Active Filters:</span>
              {activeTab !== 'all' && (
                <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {examTabs.find(t => t.id === activeTab)?.label}
                </span>
              )}
              {selectedClass !== 'all' && (
                <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">
                  {classes.find(c => c.id.toString() === selectedClass)?.name}
                </span>
              )}
              <span className="text-sm text-blue-700">
                • Showing {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedClass('all');
                setActiveTab('all');
              }}
              className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Exams List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {exams.length === 0 ? 'No exams created yet' : 'No exams found'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {exams.length === 0 
                ? 'Click "Create Exam" to get started' 
                : (selectedClass !== 'all' || activeTab !== 'all')
                  ? 'Try changing the filters or create a new exam'
                  : 'Create an exam to get started'}
            </p>
            {(selectedClass !== 'all' || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSelectedClass('all');
                  setActiveTab('all');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : activeTab === 'all' ? (
          <div className="space-y-8">
            {groupedExams.map((classGroup) => (
              <section key={classGroup.classId} className="space-y-5">
                <div className="sticky top-0 z-10 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{classGroup.className}</h2>
                    <span className="text-xs text-gray-500">
                      {classGroup.sessions.reduce((count, session) => count + session.exams.length, 0)} exam
                      {classGroup.sessions.reduce((count, session) => count + session.exams.length, 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {classGroup.sessions.map((sessionGroup) => (
                  <div key={`${classGroup.classId}-${sessionGroup.session}`} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Session</span>
                      <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-sm font-medium text-primary-800">
                        {sessionGroup.session}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sessionGroup.exams.length} exam{sessionGroup.exams.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {sessionGroup.exams.map((exam) => renderExamCard(exam))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredExams.map((exam) => renderExamCard(exam))}
          </div>
        )}

        {/* Create/Edit Exam Modal */}
        <ContentAreaModal
          open={showExamModal}
          onClose={() => {
            setShowExamModal(false);
            setEditingExam(null);
          }}
        >
          <div className="flex flex-col h-full w-full bg-white shadow-2xl">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center shrink-0">
              <h3 className="text-xl ">
                {editingExam ? 'Edit Exam' : 'Create New Exam'}
              </h3>
              <button
                onClick={() => {
                  setShowExamModal(false);
                  setEditingExam(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Name *
                  </label>
                  <input
                    type="text"
                    value={examForm.name}
                    onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mid-Term Examination 2025"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class *
                    </label>
                    <select
                      value={examForm.class_id}
                      onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects * <span className="text-gray-400 font-normal">(select one or more)</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                    {subjects.length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-2">No subjects found. Add subjects first.</p>
                    ) : (
                      subjects.map((subject) => (
                        <label
                          key={subject.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                            examForm.subject_ids.includes(subject.id.toString())
                              ? 'bg-blue-50 border border-blue-200 text-blue-900'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={examForm.subject_ids.includes(subject.id.toString())}
                            onChange={() => toggleSubjectSelection(subject.id.toString())}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          {subject.name}
                        </label>
                      ))
                    )}
                  </div>
                  {examForm.subject_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {examForm.subject_ids.length} subject(s) selected
                      {examForm.use_same_marks ? ' — same marks apply to each' : ' — marks configured per subject below'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Type *
                    </label>
                    <select
                      value={examForm.exam_type}
                      onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="half_yearly">Half-Yearly</option>
                      <option value="midterm">Mid-Term</option>
                      <option value="annual">Annual</option>
                      <option value="final">Final</option>
                      <option value="unit_test">Unit Test</option>
                      <option value="quiz">Quiz</option>
                      <option value="monthly">Monthly Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={examForm.exam_date}
                      onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Marks configuration</p>
                    <p className="text-xs text-gray-500 mt-1">
                      By default, all selected subjects use the same total and passing marks.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Marks {examForm.use_same_marks ? '(all subjects)' : '(default)'} *
                      </label>
                      <input
                        type="number"
                        value={examForm.total_marks}
                        onChange={(e) => updateDefaultMarks('total_marks', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Passing Marks {examForm.use_same_marks ? '(all subjects)' : '(default)'} *
                      </label>
                      <input
                        type="number"
                        value={examForm.passing_marks}
                        onChange={(e) => updateDefaultMarks('passing_marks', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        min="1"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!examForm.use_same_marks}
                      onChange={(e) => toggleUseSameMarks(!e.target.checked)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    Set different marks per subject
                  </label>
                  {!examForm.use_same_marks && examForm.subject_ids.length > 0 && (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-700">Subject</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-700">Total Marks</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-700">Passing Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examForm.subject_ids.map((subjectId) => {
                            const subject = subjects.find((s) => s.id.toString() === subjectId);
                            const marks = examForm.subject_marks[subjectId] || {
                              total_marks: examForm.total_marks,
                              passing_marks: examForm.passing_marks,
                            };
                            const passingExceedsTotal =
                              Number(marks.passing_marks) > Number(marks.total_marks);
                            return (
                              <tr key={subjectId} className="border-b last:border-0">
                                <td className="px-4 py-2 font-medium text-gray-900">
                                  {subject?.name || `Subject #${subjectId}`}
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={marks.total_marks}
                                    onChange={(e) => updateSubjectMarks(subjectId, 'total_marks', e.target.value)}
                                    className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg"
                                    min="1"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={marks.passing_marks}
                                    onChange={(e) => updateSubjectMarks(subjectId, 'passing_marks', e.target.value)}
                                    className={`w-28 px-3 py-1.5 border rounded-lg ${
                                      passingExceedsTotal ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    min="1"
                                    title={passingExceedsTotal ? 'Passing marks cannot exceed total marks' : undefined}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!examForm.use_same_marks && examForm.subject_ids.length === 0 && (
                    <p className="text-xs text-amber-700">Select at least one subject to configure per-subject marks.</p>
                  )}
                </div>
            </div>
            <div className="p-4 sm:p-6 border-t flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowExamModal(false);
                  setEditingExam(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExam}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiSave /> {editingExam ? 'Update' : 'Create'} Exam
              </button>
            </div>
          </div>
        </ContentAreaModal>

        {/* View Exam Details Modal */}
        <ContentAreaModal
          open={showViewModal && !!viewingExam}
          onClose={() => {
            setShowViewModal(false);
            setViewingExam(null);
            setViewResults([]);
          }}
        >
          {viewingExam && (
          <div className="flex flex-col h-full w-full bg-white shadow-2xl">
            <div className="p-4 sm:p-6 border-b flex justify-between items-start gap-4 shrink-0">
                <div>
                  <h3 className="text-xl text-gray-900">{viewingExam.name}</h3>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                    {formatExamType(viewingExam.exam_type)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExam(null);
                    setViewResults([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="text-2xl" />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Class</p>
                    <p className="font-medium text-gray-900">{viewingExam.class_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Subject(s)</p>
                    <p className="font-medium text-gray-900">{viewingExam.subject_names || viewingExam.subject_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Exam Date</p>
                    <p className="font-medium text-gray-900">
                      {viewingExam.exam_date
                        ? new Date(viewingExam.exam_date).toLocaleDateString('en-IN')
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Marks</p>
                    {viewingExam.subjects?.length ? (
                      <div className="space-y-1">
                        {viewingExam.subjects.map((sub) => (
                          <p key={sub.subject_id} className="font-medium text-gray-900 text-sm">
                            {sub.subject_name}: total {sub.total_marks}, pass {sub.passing_marks}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900">
                        Total {viewingExam.total_marks} · Pass {viewingExam.passing_marks}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Results Uploaded</p>
                    <p className="font-medium text-gray-900">
                      {viewingExam.total_results} / {viewingExam.total_students} students
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Compiled Summaries</h4>
                  {viewSummaries.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-500 text-sm mb-4">
                      No compiled summaries. Use <strong>Compile Results</strong> on the exam card.
                    </div>
                  ) : (
                    <div className="mb-6">
                      <RankingTable rows={viewSummaries} limit={10} />
                    </div>
                  )}
                </div>

                <div>
                  {viewLoading ? (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Student Results (Raw Marks)</h4>
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      </div>
                    </div>
                  ) : viewResults.length === 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Student Results (Raw Marks)</h4>
                      <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500 text-sm">
                        No results uploaded yet for this exam.
                      </div>
                    </div>
                  ) : (
                    <ExamRawResultsTable exam={viewingExam} results={viewResults} />
                  )}
                </div>
            </div>

            <div className="p-4 sm:p-6 border-t flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingExam(null);
                  setViewResults([]);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const exam = viewingExam;
                  setShowViewModal(false);
                  setViewingExam(null);
                  setViewResults([]);
                  handleUploadResults(exam);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FiUpload /> Upload Results
              </button>
            </div>
          </div>
          )}
        </ContentAreaModal>

        {/* Upload Results Modal */}
        <UploadResultsModal
          show={showResultsModal}
          exam={selectedExam}
          students={students}
          resultInputs={resultInputs}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedExam(null);
          }}
          onSave={handleSaveResults}
          onUpdateInput={updateResultInput}
        />
      </div>
    </DashboardLayout>
  );
}
