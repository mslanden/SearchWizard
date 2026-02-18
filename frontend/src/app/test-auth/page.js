"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestAuth() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults = {};

    try {
      // Test 1: Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      testResults.session = {
        success: !sessionError,
        data: session ? { userId: session.user.id, email: session.user.email } : null,
        error: sessionError?.message
      };

      if (session) {
        // Test 2: Call get_user_status_for_auth
        const { data: userStatus, error: statusError } = await supabase
          .rpc('get_user_status_for_auth', { user_id_param: session.user.id });
        
        testResults.userStatus = {
          success: !statusError,
          data: userStatus,
          error: statusError?.message
        };

        // Test 3: Direct table query with RLS
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id);
        
        testResults.directRoleQuery = {
          success: !roleError,
          data: roleData,
          error: roleError?.message
        };

        // Test 4: Call check_is_admin
        const { data: isAdmin, error: adminError } = await supabase
          .rpc('check_is_admin', { check_user_id: session.user.id });
        
        testResults.checkAdmin = {
          success: !adminError,
          data: isAdmin,
          error: adminError?.message
        };
      }

    } catch (error) {
      testResults.generalError = error.message;
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth System Test</h1>
        
        <button
          onClick={runTests}
          disabled={loading}
          className="mb-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>

        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            {Object.entries(results).map(([testName, result]) => (
              <div key={testName} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">{testName}</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}