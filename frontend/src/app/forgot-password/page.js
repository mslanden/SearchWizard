"use client";

import { useState } from 'react';
import Link from 'next/link';
import { authService } from '../../lib/auth';
import Header from '../../components/Header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const { success, error } = await authService.resetPassword(email);

      if (success) {
        setSuccess(true);
      } else {
        setError(error.message || 'Failed to send password reset email. Please try again.');
      }
    } catch (err) {

      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E6F0FF]">
      <Header />
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
                <p className="font-medium">Password reset email sent!</p>
                <p className="text-sm mt-1">Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.</p>
                <div className="mt-4 text-center">
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Return to login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="mb-6">
                  <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    placeholder="you@example.com"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    We&apos;ll send a password reset link to this email address
                  </p>
                </div>

                <div className="mb-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    )}
                    {loading ? 'Sending reset link...' : 'Send password reset link'}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign up
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
