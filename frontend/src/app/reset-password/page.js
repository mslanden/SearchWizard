"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../lib/auth';
import Header from '../../components/Header';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if we have a valid token in the URL
  useEffect(() => {
    // The token is automatically handled by Supabase
    const hasToken = searchParams.has('token');
    if (!hasToken) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [searchParams]);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const { success, error } = await authService.updatePassword(password);

      if (success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 3000);
      } else {
        setError(error.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {

      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Your Password</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {success ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                <p className="font-medium">Password reset successful!</p>
                <p className="text-sm mt-1">Your password has been updated. You will be redirected to the login page in a few seconds.</p>
                <div className="mt-4 text-center">
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Go to login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    placeholder="••••••••"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="mb-6">
                  <button
                    type="submit"
                    disabled={loading || error === 'Invalid or missing reset token. Please request a new password reset link.'}
                    className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    )}
                    {loading ? 'Resetting password...' : 'Reset password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Suspense fallback={<div className="container mx-auto px-4 py-8 max-w-md mx-auto"><div className="bg-white rounded-lg shadow-md p-6"><p className="text-center">Loading...</p></div></div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
