"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../lib/auth';
import Header from '../../components/Header';
import { validateForm, commonValidators, validators, sanitizers } from '../../utils/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Sanitize inputs
    const formData = {
      email: sanitizers.trim(email),
      password: password, // Don't trim passwords
      confirmPassword: confirmPassword
    };

    // Validation rules
    const validationRules = {
      email: commonValidators.email,
      password: commonValidators.password,
      confirmPassword: [
        validators.required,
        (value) => value !== formData.password ? 'Passwords do not match' : null
      ]
    };

    const { isValid, errors } = validateForm(formData, validationRules);
    
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { success, error } = await authService.signUp(formData.email, password);

      if (success) {
        setRegistrationSuccess(true);
        // Add a small delay to ensure the trigger has time to create the pending approval record
        setTimeout(() => {
          router.push('/pending-approval'); // Redirect to pending approval page after successful registration
        }, 1500);
      } else {
        setError(error.message || 'Failed to register. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {registrationSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">✅ Account created successfully! Redirecting to approval status...</span>
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 border ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
                  placeholder="you@example.com"
                  required
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
                  placeholder="••••••••"
                  required
                />
                {fieldErrors.password ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Must contain 8+ characters, uppercase, lowercase, and number
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
                  placeholder="••••••••"
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="mb-6">
                <button
                  type="submit"
                  disabled={loading || registrationSuccess}
                  className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}
                  {registrationSuccess ? 'Redirecting...' : loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
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
