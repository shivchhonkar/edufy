'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useActiveSchoolId } from '@/hooks/use-active-school-id';
import {
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiChevronRight,
  FiFilePlus,
  FiFlag,
  FiFolder,
  FiLayers,
  FiList,
  FiRefreshCw,
  FiUsers,
} from 'react-icons/fi';

interface LessonRow {
  id: number;
  title: string;
  lesson_date: string;
  status: string;
  class_name?: string;
  subject_name?: string;
}

interface CalendarEntry {
  id: number;
  category: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface DashboardData {
  classes: number;
  activeClasses: number;
  sections: number;
  subjects: number;
  activeSubjects: number;
  teachers: number;
  assignments: number;
  classTeachers: number;
  houses: number;
  houseStudents: number;
  categories: number;
  unmappedSubjects: number;
  uncoveredCount: number;
  classCoverage: Array<{
    class_id: number;
    class_name: string;
    class_teachers: string[];
    open_count: number;
    assigned_count: number;
    subjects: Array<{ subject_name: string; teachers: string[] }>;
  }>;
  teacherLoad: Array<{
    staff_id: number;
    teacher_name: string;
    assignment_count: number;
    class_count: number;
    assignments: string[];
  }>;
  syllabus: { total: number; notStarted: number; inProgress: number; completed: number; percent: number };
  upcomingLessons: LessonRow[];
  scheduledLessons: number;
  upcomingEvents: CalendarEntry[];
  setup: {
    year: string | null;
    percent: number;
    steps: Array<{
      key: string;
      label: string;
      href: string;
      status: 'done' | 'pending';
      detail: string;
      score: number;
    }>;
  };
}

const EMPTY: DashboardData = {
  classes: 0,
  activeClasses: 0,
  sections: 0,
  subjects: 0,
  activeSubjects: 0,
  teachers: 0,
  assignments: 0,
  classTeachers: 0,
  houses: 0,
  houseStudents: 0,
  categories: 0,
  unmappedSubjects: 0,
  uncoveredCount: 0,
  classCoverage: [],
  teacherLoad: [],
  syllabus: { total: 0, notStarted: 0, inProgress: 0, completed: 0, percent: 0 },
  upcomingLessons: [],
  scheduledLessons: 0,
  upcomingEvents: [],
  setup: { year: null, percent: 0, steps: [] },
};

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function dateKey(value?: string | null) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatDate(value?: string | null) {
  const key = dateKey(value);
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return { success: false };
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  holiday: 'Holiday',
  exam: 'Exam',
  ptm: 'PTM',
  event: 'Event',
  term_date: 'Term',
};

const LINKS = [
  { href: '/academics/classes', label: 'Classes & Sections', icon: FiLayers },
  { href: '/academics/class-categories', label: 'Class Categories', icon: FiFolder },
  { href: '/academics/subjects', label: 'Subjects', icon: FiBookOpen },
  { href: '/academics/houses', label: 'School Houses', icon: FiFlag },
  { href: '/academics/assignments', label: 'Assignments', icon: FiFilePlus },
  { href: '/academics/teachers', label: 'Teachers', icon: FiUsers },
  { href: '/academics/timetable', label: 'Timetable', icon: FiCalendar },
  { href: '/academics/classes?tab=lesson-plans', label: 'Lesson Plans', icon: FiList },
  { href: '/academics/syllabus', label: 'Syllabus', icon: FiCheckSquare },
  { href: '/academics/academic-calendar', label: 'Calendar', icon: FiCalendar },
];

export default function AcademicsDashboardView() {
  const schoolId = useActiveSchoolId();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [coverageTab, setCoverageTab] = useState<'class' | 'teacher'>('class');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'open'>('all');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'free'>('all');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/academics/dashboard?date=${todayKey()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await readJson(response);
      if (!response.ok || !json.success || !json.data) {
        setError(json.error || 'Could not load the latest academic records.');
        return;
      }
      setData({ ...EMPTY, ...json.data });
    } catch (loadError) {
      console.error('Failed to load academics dashboard', loadError);
      setError('Could not load the latest academic records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
  };

  const kpis = [
    { label: 'Classes', value: data.activeClasses, hint: `${data.classes} total`, href: '/academics/classes' },
    { label: 'Sections', value: data.sections, hint: `${data.categories} categories`, href: '/academics/class-categories' },
    { label: 'Subjects', value: data.activeSubjects, hint: `${data.unmappedSubjects} not on a class`, href: '/academics/subjects' },
    { label: 'Teachers', value: data.teachers, hint: `${data.classTeachers} class teachers`, href: '/academics/teachers' },
    { label: 'Assignments', value: data.assignments, hint: `${data.uncoveredCount} subjects open`, href: '/academics/assignments' },
    { label: 'Houses', value: data.houses, hint: `${data.houseStudents} students placed`, href: '/academics/houses' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Academics</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Classes, teaching load, syllabus progress, and what is coming up.
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm hover:border-primary-200"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
            {loading ? (
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-gray-100" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{card.value}</p>
            )}
            <p className="mt-1 text-[11px] text-gray-500">{loading ? ' ' : card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:border-primary-200 hover:text-primary-700"
            >
              <Icon className="shrink-0 text-primary-600" size={14} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {data.setup.year ? `Academic Year ${data.setup.year}` : 'Academic year not set'}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {data.setup.steps.filter((step) => step.status === 'done').length} of {data.setup.steps.length || 8} steps ready
            </p>
          </div>
          <p className="text-lg font-semibold tabular-nums leading-none text-gray-900">{data.setup.percent}%</p>
        </div>
        <div className="px-4 pb-3 pt-2">
          <div className="flex h-2.5 gap-1" role="img" aria-label={`Setup ${data.setup.percent} percent complete`}>
            {data.setup.steps.map((step) => {
              const score = Math.max(0, Math.min(1, Number(step.score) || (step.status === 'done' ? 1 : 0)));
              return (
                <div key={step.key} className="h-full flex-1 overflow-hidden rounded-full bg-gray-100" title={`${step.label}: ${step.status === 'done' ? 'Ready' : step.detail}`}>
                  <div
                    className={`h-full rounded-full ${score >= 1 ? 'bg-green-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.round(score * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <ol className="grid grid-cols-1 gap-2 border-t border-gray-100 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.setup.steps.map((step, index) => {
            const done = step.status === 'done';
            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                    done ? 'border-gray-100 hover:bg-gray-50' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-gray-900">{step.label}</span>
                    <span className={`block truncate text-[11px] ${done ? 'text-green-700' : 'text-amber-800'}`}>
                      {done ? 'Ready' : step.detail}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
            <div>
              <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setCoverageTab('class')}
                  className={`rounded px-2 py-1 ${coverageTab === 'class' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                >
                  By class
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageTab('teacher')}
                  className={`rounded px-2 py-1 ${coverageTab === 'teacher' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                >
                  By teacher
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {loading
                  ? ' '
                  : coverageTab === 'class'
                    ? `${data.classCoverage.length} classes · ${data.uncoveredCount} subjects still open`
                    : `${data.teacherLoad.length} teachers · ${data.teacherLoad.filter((row) => row.assignment_count === 0).length} free`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {coverageTab === 'class' ? (
                <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCoverageFilter('all')}
                    className={`rounded px-2 py-1 ${coverageFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverageFilter('open')}
                    className={`rounded px-2 py-1 ${coverageFilter === 'open' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                  >
                    Open only
                  </button>
                </div>
              ) : (
                <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTeacherFilter('all')}
                    className={`rounded px-2 py-1 ${teacherFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherFilter('free')}
                    className={`rounded px-2 py-1 ${teacherFilter === 'free' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
                  >
                    Free
                  </button>
                </div>
              )}
              <Link href="/academics/assignments" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Assign
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : coverageTab === 'teacher' ? (
            data.teacherLoad.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">No teachers on record.</p>
            ) : data.teacherLoad.every((row) => teacherFilter === 'free' && row.assignment_count > 0) ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">Every teacher has at least one class or subject.</p>
            ) : (
              <div className="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
                {data.teacherLoad
                  .filter((row) => teacherFilter === 'all' || row.assignment_count === 0)
                  .map((row) => {
                    const free = row.assignment_count === 0;
                    return (
                      <div key={row.staff_id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{row.teacher_name}</p>
                            <p className="text-[11px] text-gray-500">
                              {free
                                ? 'No class or subject assigned'
                                : `${row.assignment_count} assignment${row.assignment_count === 1 ? '' : 's'} · ${row.class_count} class${row.class_count === 1 ? '' : 'es'}`}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              free
                                ? 'border border-green-200 bg-green-50 text-green-800'
                                : row.assignment_count >= 8
                                  ? 'border border-amber-200 bg-amber-50 text-amber-800'
                                  : 'border border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                          >
                            {free ? 'Free' : `${row.assignment_count} assigned`}
                          </span>
                        </div>
                        {!free && (
                          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {row.assignments.map((assignment) => (
                              <li key={assignment} className="truncate rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
                                {assignment}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
              </div>
            )
          ) : data.classCoverage.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">
              Add subjects, then map them to classes.
            </p>
          ) : data.classCoverage.every((row) => coverageFilter === 'open' && row.open_count === 0) ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">Every class subject has a teacher.</p>
          ) : (
            <div className="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
              {data.classCoverage
                .filter((row) => coverageFilter === 'all' || row.open_count > 0)
                .map((row) => {
                  const subjects =
                    coverageFilter === 'open'
                      ? row.subjects.filter((subject) => subject.teachers.length === 0)
                      : row.subjects;
                  return (
                    <div key={row.class_id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{row.class_name}</p>
                          <p className="text-[11px] text-gray-500">
                            <strong>Class teacher:</strong> {' '}
                            {row.class_teachers.length > 0 ? row.class_teachers.join(', ') : 'Unassigned'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            row.open_count > 0
                              ? 'border border-amber-200 bg-amber-50 text-amber-800'
                              : 'border border-green-200 bg-green-50 text-green-800'
                          }`}
                        >
                          {row.open_count > 0 ? `${row.open_count} open` : 'Covered'}
                        </span>
                      </div>
                      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {subjects.map((subject) => {
                          const open = subject.teachers.length === 0;
                          return (
                            <li
                              key={subject.subject_name}
                              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs ${
                                open ? 'bg-amber-50' : 'bg-gray-50'
                              }`}
                            >
                              <span className="truncate text-gray-800">{subject.subject_name}</span>
                              <span className={`shrink-0 truncate ${open ? 'font-medium text-amber-800' : 'text-gray-600'}`}>
                                {open ? 'Unassigned' : subject.teachers.join(', ')}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Syllabus</h2>
            <Link href="/academics/syllabus" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              Track
            </Link>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>Periods completed</span>
                <span className="font-semibold tabular-nums text-gray-900">{data.syllabus.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary-600" style={{ width: `${data.syllabus.percent}%` }} />
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-gray-500">Waiting</dt>
                <dd className="text-sm font-semibold tabular-nums text-gray-900">{data.syllabus.notStarted}</dd>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-amber-700">In progress</dt>
                <dd className="text-sm font-semibold tabular-nums text-amber-900">{data.syllabus.inProgress}</dd>
              </div>
              <div className="rounded-lg bg-green-50 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-green-700">Done</dt>
                <dd className="text-sm font-semibold tabular-nums text-green-900">{data.syllabus.completed}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-gray-500">{data.syllabus.total} chapters on record.</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Coming up Events & Holidays</h2>
            <Link href="/academics/academic-calendar" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700">
              Calendar <FiChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : data.upcomingEvents.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">No holidays, exams, or events ahead.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.upcomingEvents.map((entry) => (
                <li key={`${entry.category}-${entry.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900">{entry.title}</p>
                    <p className="text-[11px] text-gray-500">{formatDate(entry.start_date)}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {CATEGORY_LABEL[entry.category] || 'Event'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Lesson plans</h2>
            <Link href="/academics/classes?tab=lesson-plans" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700">
              Open <FiChevronRight size={12} />
            </Link>
          </div>
          <div className="border-b border-gray-100 px-4 py-2 text-[11px] text-gray-500">
            {data.scheduledLessons} scheduled
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : data.upcomingLessons.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-500">No upcoming lesson plans.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.upcomingLessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900">{lesson.title}</p>
                    <p className="truncate text-[11px] text-gray-500">
                      {[lesson.class_name, lesson.subject_name].filter(Boolean).join(' · ') || 'Lesson'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-gray-500">{formatDate(lesson.lesson_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
