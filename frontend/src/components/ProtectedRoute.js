"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isApproved, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No user, redirect to login
        router.push('/login');
      } else if (!isApproved) {
        // User exists but not approved, redirect to pending approval page
        router.push('/pending-approval');
      }
    }
  }, [user, isApproved, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#E6F0FF] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated or not approved, don't render children (will redirect)
  if (!user || !isApproved) {
    return null;
  }

  // If authenticated and approved, render children
  return children;
}
