'use client';

import { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

export default function SetupExamsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/setup-exams', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to setup exam system',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-xl text-gray-900 mb-2">Exam System Setup</h1>
        <p className="text-gray-600 mb-6">
          Click the button below to create the necessary database tables for the exam and results management system.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">This will create:</h3>
          <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
            <li>exams table - Store exam information</li>
            <li>exam_results table - Store student results</li>
            <li>Database indexes for better performance</li>
            <li>calculate_grade() function for auto-grading</li>
          </ul>
        </div>

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium mb-6"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={20} />
              Setting up...
            </>
          ) : (
            'Run Setup'
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
                  {result.success ? 'Setup Completed!' : 'Setup Failed'}
                </h3>
                <p
                  className={`text-sm ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
                {result.data && (
                  <div className="mt-3 text-sm text-green-700">
                    <p>• Exams in database: {result.data.exams_count}</p>
                    <p>• Results in database: {result.data.results_count}</p>
                  </div>
                )}
                {result.success && (
                  <div className="mt-4">
                    <a
                      href="/exams"
                      className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Go to Exams Page
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Note:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• This setup is safe to run multiple times (uses IF NOT EXISTS)</li>
            <li>• Existing data will not be affected</li>
            <li>• Make sure you have the required tables: classes, subjects, students</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


























































