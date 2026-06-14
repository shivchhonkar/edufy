'use client';

import { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';

export default function SetupSubjectsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup-subjects');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ success: false, error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  };

  const runSetup = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/setup-subjects', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
      
      // Refresh status after setup
      if (data.success) {
        setTimeout(checkStatus, 1000);
      }
    } catch (error) {
      console.error('Error running setup:', error);
      setResult({ success: false, error: 'Failed to run setup' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-xl text-gray-900 mb-4">
            Setup Class-Subjects Table
          </h1>
          <p className="text-gray-600 mb-8">
            This will create the <code className="bg-gray-100 px-2 py-1 rounded">class_subjects</code> table,
            add default subjects, and assign them to all classes.
          </p>

          {/* Check Status Button */}
          <div className="mb-8">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Check Current Status
            </button>
          </div>

          {/* Status Display */}
          {status && (
            <div className={`mb-8 p-6 rounded-lg ${status.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                {status.success ? (
                  <>
                    <FiCheckCircle className="text-green-600" />
                    <span>Status: {status.message}</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="text-red-600" />
                    <span>Status: {status.message || 'Error'}</span>
                  </>
                )}
              </h3>
              
              {status.data && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600">Subjects in DB</p>
                    <p className="text-xl text-gray-900">{status.data.subjects_count}</p>
                  </div>
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600">Classes in DB</p>
                    <p className="text-xl text-gray-900">{status.data.classes_count}</p>
                  </div>
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600">Total Assignments</p>
                    <p className="text-xl text-gray-900">{status.data.assignments?.total_assignments || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600">Unique Subjects Assigned</p>
                    <p className="text-xl text-gray-900">{status.data.assignments?.total_subjects || 0}</p>
                  </div>
                </div>
              )}

              {status.error && (
                <div className="mt-4 p-4 bg-white rounded">
                  <p className="text-sm font-mono text-red-600">{status.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Run Setup Button */}
          <div className="mb-8">
            <button
              onClick={runSetup}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg font-semibold"
            >
              {loading ? 'Running Setup...' : 'Run Setup Now'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Safe to run multiple times - will skip existing records
            </p>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-6 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                {result.success ? (
                  <>
                    <FiCheckCircle className="text-green-600" />
                    <span>Setup Successful!</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="text-red-600" />
                    <span>Setup Failed</span>
                  </>
                )}
              </h3>
              
              {result.success && result.data && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600 mb-2">Summary</p>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>Subjects in Database:</span>
                        <span className="font-semibold">{result.data.subjects_in_db}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Classes in Database:</span>
                        <span className="font-semibold">{result.data.classes_in_db}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>New Subjects Inserted:</span>
                        <span className="font-semibold text-green-600">{result.data.subjects_inserted}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>New Assignments Created:</span>
                        <span className="font-semibold text-green-600">{result.data.assignments_created}</span>
                      </li>
                    </ul>
                  </div>

                  {result.data.summary && (
                    <div className="bg-white p-4 rounded">
                      <p className="text-sm text-gray-600 mb-2">Current Database State</p>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span>Total Classes with Assignments:</span>
                          <span className="font-semibold">{result.data.summary.total_classes}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Total Subjects Assigned:</span>
                          <span className="font-semibold">{result.data.summary.total_subjects}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Total Class-Subject Assignments:</span>
                          <span className="font-semibold">{result.data.summary.total_assignments}</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-blue-800 font-semibold mb-2">✅ Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Go to <a href="/subjects" className="underline">Subjects Page</a></li>
                      <li>Try assigning subjects to classes</li>
                      <li>Create homework with subjects</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {result.error && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-red-800">Error:</p>
                  <pre className="p-4 bg-white rounded text-xs text-red-600 overflow-auto">
                    {result.error}
                  </pre>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-red-700">Show Details</summary>
                      <pre className="mt-2 p-4 bg-white rounded text-xs text-gray-600 overflow-auto">
                        {result.details}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-lg mb-4">What This Does:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Creates the <code className="bg-white px-2 py-1 rounded">class_subjects</code> table</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Adds 8 default subjects (Math, English, Science, CS, SS, Hindi, PE, Art)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Assigns all subjects to all classes automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Creates indexes for better performance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


























































