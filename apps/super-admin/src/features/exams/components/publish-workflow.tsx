'use client';

import { useState } from 'react';
import { FiCheck, FiEye, FiSend, FiRotateCcw, FiLayers } from 'react-icons/fi';
import { useDialog } from '@/shared/context/DialogContext';
import WorkflowBadge from '@/features/exams/components/workflow-badge';
import type { ResultWorkflowStatus } from '@/lib/ensure-exam-result-engine';

interface PublishWorkflowProps {
  examId: number;
  status?: ResultWorkflowStatus | string | null;
  onUpdated: () => void;
}

export default function PublishWorkflow({ examId, status, onUpdated }: PublishWorkflowProps) {
  const { alert, confirm } = useDialog();
  const [loading, setLoading] = useState<string | null>(null);
  const workflow = (status || 'draft') as ResultWorkflowStatus;

  const callAction = async (action: string, label: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/exams/${examId}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await alert(data.message || `${label} completed`, { title: label, type: 'success' });
        onUpdated();
      } else {
        await alert(data.error || 'Action failed', { title: label, type: 'error' });
      }
    } catch {
      await alert('Action failed', { title: label, type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleCompile = () => callAction('compile', 'Compile Results');
  const handleSubmit = () => callAction('submit-review', 'Submit for Review');
  const handleApprove = () => callAction('approve', 'Approve');
  const handlePublish = async () => {
    const ok = await confirm('Publish results to parent portal?', {
      title: 'Publish Results',
      type: 'warning',
      confirmText: 'Publish',
    });
    if (ok) await callAction('publish', 'Publish');
  };
  const handleUnpublish = async () => {
    const ok = await confirm('Unpublish results? Parents will no longer see them.', {
      title: 'Unpublish',
      type: 'danger',
      confirmText: 'Unpublish',
    });
    if (ok) await callAction('unpublish', 'Unpublish');
  };

  const btn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 mt-3">
      <WorkflowBadge status={workflow} />
      <button
        type="button"
        disabled={!!loading}
        onClick={handleCompile}
        className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}
      >
        <FiLayers size={14} />
        {loading === 'compile' ? 'Compiling...' : 'Compile Results'}
      </button>
      {workflow === 'draft' && (
        <button
          type="button"
          disabled={!!loading}
          onClick={handleSubmit}
          className={`${btn} border border-amber-200 text-amber-800 hover:bg-amber-50`}
        >
          <FiSend size={14} />
          Submit for Review
        </button>
      )}
      {workflow === 'under_review' && (
        <button
          type="button"
          disabled={!!loading}
          onClick={handleApprove}
          className={`${btn} border border-blue-200 text-blue-800 hover:bg-blue-50`}
        >
          <FiCheck size={14} />
          Approve
        </button>
      )}
      {workflow === 'approved' && (
        <button
          type="button"
          disabled={!!loading}
          onClick={handlePublish}
          className={`${btn} bg-green-600 text-white hover:bg-green-700`}
        >
          <FiEye size={14} />
          Publish Results
        </button>
      )}
      {workflow === 'published' && (
        <button
          type="button"
          disabled={!!loading}
          onClick={handleUnpublish}
          className={`${btn} border border-red-200 text-red-700 hover:bg-red-50`}
        >
          <FiRotateCcw size={14} />
          Unpublish
        </button>
      )}
    </div>
  );
}
