"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    if (user) {
      // Extract name from email if available
      const emailName = user.email ? user.email.split('@')[0] : '';
      setUserName(user.user_metadata?.name || emailName || 'User');
    }
  }, [user]);
  
  // Subscription data - in a real app, you would fetch this from your subscription service
  const subscription = {
    plan: 'Professional',
    status: 'Active',
    nextBilling: 'April 25, 2025',
    features: [
      'Unlimited projects',
      'Custom AI prompts',
      'Export to multiple formats',
      'Priority support'
    ]
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Link href="/" className="flex items-center text-gray-600 mb-6 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to projects
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-gray-200 p-4 rounded-full">
                      <UserCircleIcon className="w-12 h-12 text-gray-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-gray-800">{userName}</h2>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mb-6">
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                      Edit Profile
                    </button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <button 
                      onClick={signOut}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-800 mb-4">Subscription</h2>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-purple-100 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-800 font-medium">{subscription.plan} Plan</span>
                          <span className="ml-3 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            {subscription.status}
                          </span>
                        </div>
                        <button className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded hover:bg-gray-200 transition-colors">
                          Manage Subscription
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Next billing date: {subscription.nextBilling}
                      </p>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium mb-2 text-gray-700">Features included:</h3>
                      <ul className="space-y-2">
                        {subscription.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
