"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import { validateForm, commonValidators, sanitizers } from '../../utils/validation';
import Input from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form inputs
    const formData = {
      email: sanitizers.trim(email),
      password: password // Don't trim passwords
    };

    const validationRules = {
      email: commonValidators.email,
      password: [
        (value) => !value ? 'Password is required' : null
      ]
    };

    const { isValid, errors } = validateForm(formData, validationRules);
    
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Use the AuthContext signIn method which handles navigation automatically
      await signIn(formData.email, password);
      // Navigation is handled by the AuthContext, no need to manually redirect
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md overflow-hidden transition-colors">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-dark-text mb-6">Log in to Search Wizard</h2>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                error={fieldErrors.email}
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-light dark:hover:text-brand-purple transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  error={fieldErrors.password}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-purple hover:bg-brand-purple-dark dark:bg-brand-purple-light dark:hover:bg-brand-purple text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="mt-4 text-center text-sm text-gray-600 dark:text-dark-text-muted">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-light dark:hover:text-brand-purple transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
