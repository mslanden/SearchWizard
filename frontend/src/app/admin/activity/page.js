"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  EyeIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import Header from '../../../components/Header';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Fetch activity log
  const fetchActivityLog = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = new URL('/api/admin/activity-log', window.location.origin);
      if (filter !== 'all') {
        url.searchParams.set('action_type', filter);
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Activity log response:', data); // Debug log
        setActivities(data.activities || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch activity log:', errorData);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setActivities([]);
    }
  }, [filter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchActivityLog();
      setLoading(false);
    };

    loadData();
  }, [filter, fetchActivityLog]); // Refetch when filter changes

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'approve_user':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'deny_user':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'deactivate_user':
        return <NoSymbolIcon className="w-5 h-5 text-orange-500" />;
      case 'assign_role':
        return <ShieldCheckIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <UserIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionText = (activity) => {
    switch (activity.action_type) {
      case 'approve_user':
        return `Approved user registration for ${activity.target_email}`;
      case 'deny_user':
        return `Denied user registration for ${activity.target_email}`;
      case 'deactivate_user':
        return `Deactivated user ${activity.target_email}`;
      case 'assign_role':
        return `Assigned ${activity.details?.role} role to ${activity.target_email}`;
      default:
        return `Performed ${activity.action_type} on ${activity.target_email}`;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.action_type === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="flex items-center text-gray-600 mb-4 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <EyeIcon className="w-8 h-8 mr-3 text-gray-600" />
            Admin Activity Log
          </h1>
          <p className="text-gray-600 mt-2">View all administrative actions and changes</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Actions
            </button>
            <button
              onClick={() => setFilter('approve_user')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'approve_user'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Approvals
            </button>
            <button
              onClick={() => setFilter('deny_user')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'deny_user'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Denials
            </button>
            <button
              onClick={() => setFilter('assign_role')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'assign_role'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Role Changes
            </button>
            <button
              onClick={() => setFilter('deactivate_user')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'deactivate_user'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Deactivations
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
              Recent Activity ({filteredActivities.length})
            </h2>
          </div>

          <div className="p-6">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <EyeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No activity found</p>
                <p className="text-gray-400">
                  {filter === 'all' 
                    ? 'No administrative actions have been recorded yet.'
                    : `No ${filter.replace('_', ' ')} actions found.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        {getActionIcon(activity.action_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {getActionText(activity)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          By {activity.admin_email}
                        </p>
                        
                        {activity.details?.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <strong>Notes:</strong> {activity.details.notes}
                          </div>
                        )}
                        
                        {activity.details && Object.keys(activity.details).length > 1 && (
                          <div className="mt-2">
                            <details className="text-sm">
                              <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                                View details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-x-auto">
                                {JSON.stringify(activity.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <AdminProtectedRoute>
      <ActivityLog />
    </AdminProtectedRoute>
  );
}