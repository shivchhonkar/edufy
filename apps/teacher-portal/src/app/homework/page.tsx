'use client'

import { useEffect, useState } from 'react'
import { PortalPageShell, PortalLoadingSpinner } from '@edulakhya/ui'
import { format } from 'date-fns'
import { getAuthHeaders } from '@/lib/auth'

type Assignment = {
  id: number
  class_id: number
  section_id: number | null
  subject_id: number | null
  class_name: string
  section_name: string | null
  subject_name: string | null
}

type Homework = {
  id: number
  title: string
  description: string | null
  class_name: string
  subject_name: string
  due_date: string
  total_submissions: number
  submitted_count: number
  created_at: string
}

export default function HomeworkPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [homework, setHomework] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: '',
    total_marks: '100',
  })

  const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/assignments', { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch('/api/homework', { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([assignmentsRes, homeworkRes]) => {
        if (assignmentsRes.success) setAssignments(assignmentsRes.data)
        if (homeworkRes.success) setHomework(homeworkRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const subjectsForClass = assignments.filter(
    (a) => String(a.class_id) === form.class_id && a.subject_id,
  )

  const uniqueClasses = Array.from(
    new Map(assignments.map((a) => [a.class_id, a])).values(),
  )

  const sectionsForClass = assignments.filter(
    (a) => String(a.class_id) === form.class_id && a.section_id,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          class_id: parseInt(form.class_id, 10),
          section_id: form.section_id ? parseInt(form.section_id, 10) : null,
          subject_id: parseInt(form.subject_id, 10),
          title: form.title,
          description: form.description,
          due_date: form.due_date,
          total_marks: parseInt(form.total_marks, 10) || 100,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message || 'Homework assigned to all students')
        setForm({
          class_id: '',
          section_id: '',
          subject_id: '',
          title: '',
          description: '',
          due_date: '',
          total_marks: '100',
        })
        setShowForm(false)
        loadData()
      } else {
        setError(data.error || 'Failed to assign homework')
      }
    } catch {
      setError('Failed to assign homework')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PortalPageShell
      title="Homework"
      subtitle="Assign mandatory homework to all students in your class"
    >
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700"
        >
          {showForm ? 'Cancel' : 'Assign Homework'}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">New Homework Assignment</h3>
          <p className="text-sm text-slate-500 mb-4">
            Homework will be automatically assigned to all active students in the selected class.
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                required
                value={form.class_id}
                onChange={(e) =>
                  setForm({ ...form, class_id: e.target.value, section_id: '', subject_id: '' })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">Select class</option>
                {uniqueClasses.map((a) => (
                  <option key={a.class_id} value={a.class_id}>
                    {a.class_name}
                  </option>
                ))}
              </select>
            </div>
            {sectionsForClass.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                <select
                  value={form.section_id}
                  onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">All sections</option>
                  {sectionsForClass.map((a) => (
                    <option key={a.section_id!} value={a.section_id!}>
                      {a.section_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select
                required
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                disabled={!form.class_id}
              >
                <option value="">Select subject</option>
                {subjectsForClass.map((a) => (
                  <option key={`${a.subject_id}-${a.section_id}`} value={a.subject_id!}>
                    {a.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="e.g. Chapter 5 Exercise Questions"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Instructions for students..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks</label>
              <input
                type="number"
                min="1"
                value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Assign to All Students'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <PortalLoadingSpinner />
      ) : homework.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          No homework assigned yet. Create your first assignment above.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {homework.map((hw) => (
              <div key={hw.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-slate-900">{hw.title}</h4>
                    <p className="text-sm text-slate-600">
                      {hw.class_name} · {hw.subject_name}
                    </p>
                    {hw.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{hw.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-700">
                      Due {format(new Date(hw.due_date), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {hw.submitted_count}/{hw.total_submissions} submitted
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalPageShell>
  )
}
