"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import AdminProtectedRoute from '../../components/AdminProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

function AdminDashboard() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    approvedToday: 0,
    activeAdmins: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Error fetching stats:', await response.json());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Handle user approval
  const handleApproveUser = async (approvalId) => {
    setActionLoading(prev => ({ ...prev, [approvalId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          approval_id: approvalId,
          admin_notes: adminNotes
        })
      });

      if (response.ok) {
        await refreshData();
        setAdminNotes('');
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert('Error approving user: ' + error.error);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Error approving user');
    } finally {
      setActionLoading(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  // Handle user denial
  const handleDenyUser = async (approvalId) => {
    setActionLoading(prev => ({ ...prev, [approvalId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/deny-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          approval_id: approvalId,
          admin_notes: adminNotes
        })
      });

      if (response.ok) {
        await refreshData();
        setAdminNotes('');
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert('Error denying user: ' + error.error);
      }
    } catch (error) {
      console.error('Error denying user:', error);
      alert('Error denying user');
    } finally {
      setActionLoading(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPendingApprovals(),
        fetchStats()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Refresh stats after approval/denial actions
  const refreshData = async () => {
    await Promise.all([
      fetchPendingApprovals(),
      fetchStats()
    ]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <Link href="/" className="flex items-center text-gray-600 mb-4 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to projects
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShieldCheckIcon className="w-8 h-8 mr-3 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage user approvals and system administration</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <UsersIcon className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeAdmins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              Manage Users
            </Link>
            <Link 
              href="/admin/activity"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              View Activity Log
            </Link>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-orange-500" />
              Pending User Approvals ({pendingApprovals.length})
            </h2>
          </div>

          <div className="p-6">
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No pending approvals!</p>
                <p className="text-gray-400">All user registration requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <UserPlusIcon className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <h3 className="font-medium text-gray-900">{approval.email}</h3>
                            <p className="text-sm text-gray-600">
                              {approval.full_name && `${approval.full_name} • `}
                              Registered {formatDate(approval.registration_date)}
                            </p>
                          </div>
                        </div>
                        
                        {selectedUser === approval.id && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Admin Notes (optional)
                            </label>
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              rows="2"
                              placeholder="Add notes about this approval decision..."
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        {selectedUser === approval.id ? (
                          <>
                            <button
                              onClick={() => handleApproveUser(approval.id)}
                              disabled={actionLoading[approval.id]}
                              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[approval.id] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyUser(approval.id)}
                              disabled={actionLoading[approval.id]}
                              className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[approval.id] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <XCircleIcon className="w-4 h-4 mr-1" />
                              )}
                              Deny
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(null);
                                setAdminNotes('');
                              }}
                              className="px-3 py-2 text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedUser(approval.id)}
                            className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                          >
                            Review
                          </button>
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

export default function AdminPage() {
  return (
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  );
}