'use client';

import { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiLoader, FiTool } from 'react-icons/fi';

export default function FixExamsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; columns?: any[]; alreadyFixed?: boolean } | null>(null);

  const handleFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/fix-exams', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to fix exams table',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <FiTool className="text-red-600 text-3xl" />
          <h1 className="text-xl text-gray-900">Fix Exams Table</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">Problem:</h3>
          <p className="text-red-800 text-sm mb-2">
            Error: column "subject_id" of relation "exams" does not exist
          </p>
          <h3 className="font-semibold text-red-900 mb-2 mt-3">Solution:</h3>
          <p className="text-red-800 text-sm">
            This fix will add the missing <code className="bg-red-100 px-1 py-0.5 rounded">subject_id</code> column to your exams table.
          </p>
        </div>

        <button
          onClick={handleFix}
          disabled={loading}
          className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium mb-6"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={20} />
              Fixing...
            </>
          ) : (
            <>
              <FiTool size={20} />
              Fix Exams Table Now
            </>
          )}
        </button>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <FiCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <FiXCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold mb-1 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? (result.alreadyFixed ? 'Already Fixed!' : 'Fix Completed!') : 'Fix Failed'}
                </h3>
                <p
                  className={`text-sm ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
                {result.columns && result.columns.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-green-800 mb-2">Exams Table Columns:</p>
                    <div className="bg-white rounded border border-green-200 p-2 max-h-40 overflow-y-auto">
                      <ul className="text-xs text-green-700 space-y-1">
                        {result.columns.map((col: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="font-mono bg-green-100 px-2 py-0.5 rounded">{col.column_name}</span>
                            <span className="text-gray-600">({col.data_type})</span>
                            {col.column_name === 'subject_id' && (
                              <span className="text-green-600 font-semibold">✓ FIXED</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {result.success && (
                  <div className="mt-4 flex gap-2">
                    <a
                      href="/exams"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Go to Exams Page
                    </a>
                    <a
                      href="/setup-exams"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Complete Setup
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">What this does:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Checks if subject_id column exists</li>
            <li>Adds the subject_id column if missing</li>
            <li>Creates a foreign key constraint to subjects table</li>
            <li>Verifies the fix was successful</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            💡 After this fix, you'll be able to create exams with subject selection.
          </p>
        </div>
      </div>
    </div>
  );
}


























































