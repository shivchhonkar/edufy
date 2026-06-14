'use client';

import { useState } from 'react';
import { FiTool, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

export default function FixExamsColumnsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/add-subject-column', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Failed to fix exams table',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <FiTool className="text-red-600 text-3xl" />
          <h1 className="text-xl text-gray-900">Fix Exams Table</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">Common Errors This Fixes:</h3>
          <p className="text-red-800 text-sm mb-1">
            ❌ column "subject_id" of relation "exams" does not exist
          </p>
          <p className="text-red-800 text-sm mb-1">
            ❌ null value in column "X" violates not-null constraint
          </p>
          <p className="text-red-800 text-sm mb-1">
            ❌ new row violates check constraint "exams_exam_type_check"
          </p>
          <p className="text-red-800 text-sm">
            ❌ function calculate_grade(unknown, unknown) does not exist
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">This fix will:</h3>
          <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
            <li>Add <code className="bg-blue-100 px-2 py-0.5 rounded">subject_id</code> column (with foreign key)</li>
            <li>Add <code className="bg-blue-100 px-2 py-0.5 rounded">passing_marks</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">exam_date</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">created_by</code> columns</li>
            <li>Add <code className="bg-blue-100 px-2 py-0.5 rounded">created_at</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">updated_at</code> timestamp columns</li>
            <li>Add/Fix <code className="bg-blue-100 px-2 py-0.5 rounded">academic_year</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">start_date</code>, <code className="bg-blue-100 px-2 py-0.5 rounded">end_date</code> columns</li>
            <li><strong>Remove ALL NOT NULL constraints</strong> from exams table (except id)</li>
            <li><strong>Remove ALL CHECK constraints</strong> (like exam_type_check)</li>
            <li><strong>Create calculate_grade() function</strong> for auto-grading (A+ to F)</li>
            <li>API will auto-fetch academic year from settings when creating exams</li>
          </ul>
          <p className="text-blue-700 text-xs mt-2 font-semibold">✨ This fixes ALL column, constraint, validation, and function errors!</p>
        </div>

        <button
          onClick={handleFix}
          disabled={loading}
          className="w-full bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg mb-6"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={24} />
              Adding Columns...
            </>
          ) : (
            <>
              <FiTool size={24} />
              Add Missing Columns Now
            </>
          )}
        </button>

        {result && (
          <div
            className={`p-6 rounded-lg border-2 ${
              result.success
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <FiCheckCircle className="text-green-600 flex-shrink-0 mt-1" size={28} />
              ) : (
                <FiXCircle className="text-red-600 flex-shrink-0 mt-1" size={28} />
              )}
              <div className="flex-1">
                <h3
                  className={`font-bold text-xl mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? '✅ Fix Completed Successfully!' : '❌ Fix Failed'}
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
                
                {result.addedColumns && result.addedColumns.length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded border border-green-200">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      ✅ Added Columns:
                    </p>
                    <ul className="text-sm text-green-800 space-y-1">
                      {result.addedColumns.map((col: string) => (
                        <li key={col} className="flex items-center gap-2">
                          <span className="font-mono bg-green-100 px-2 py-1 rounded">{col}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.verification && (
                  <div className="mb-4 p-3 bg-white rounded border border-green-200">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      Verification:
                    </p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>
                        Has subject_id: {result.verification.hasSubjectId ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has passing_marks: {result.verification.hasPassingMarks ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has exam_date: {result.verification.hasExamDate ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has created_by: {result.verification.hasCreatedBy ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has created_at: {result.verification.hasCreatedAt ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has updated_at: {result.verification.hasUpdatedAt ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has academic_year: {result.verification.hasAcademicYear ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has start_date: {result.verification.hasStartDate ? '✅ YES' : '❌ NO'}
                      </li>
                      <li>
                        Has end_date: {result.verification.hasEndDate ? '✅ YES' : '❌ NO'}
                      </li>
                    </ul>
                    {result.verification.remainingNotNull && result.verification.remainingNotNull.length > 0 && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-900">⚠️ Columns still with NOT NULL:</p>
                        <p className="text-xs text-yellow-800">{result.verification.remainingNotNull.join(', ')}</p>
                      </div>
                    )}
                    {result.verification.remainingNotNull && result.verification.remainingNotNull.length === 0 && (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-900">✅ All NOT NULL constraints removed!</p>
                      </div>
                    )}
                    {result.verification.allColumns && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">All columns in exams table:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.verification.allColumns.map((col: string) => (
                            <span key={col} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {result.success && (
                  <div className="flex gap-3 mt-4">
                    <a
                      href="/exams"
                      className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
                    >
                      Go to Exams Page
                    </a>
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Refresh This Page
                    </button>
                  </div>
                )}

                {!result.success && result.error && (
                  <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                    <p className="text-xs font-semibold text-red-900 mb-1">Error Details:</p>
                    <p className="text-xs text-red-800">{result.error}</p>
                    {result.details && (
                      <p className="text-xs text-red-700 mt-1">{result.details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">What happens when you click the button:</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Adds all missing columns (subject_id, passing_marks, exam_date, created_by, created_at, updated_at, academic_year, start_date, end_date)</li>
            <li>Removes NOT NULL constraints from academic_year, start_date, end_date</li>
            <li><strong>Removes ALL remaining NOT NULL constraints</strong> from any other columns</li>
            <li><strong>Removes ALL CHECK constraints</strong> (exam_type_check, etc.)</li>
            <li>Creates foreign key constraints to subjects and users tables</li>
            <li><strong>Creates calculate_grade() database function</strong> for auto-grading results</li>
            <li>Verifies all columns and reports any remaining issues</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            💡 After clicking the button and seeing success, go to the Exams page and try creating an exam again!
          </p>
        </div>
      </div>
    </div>
  );
}

