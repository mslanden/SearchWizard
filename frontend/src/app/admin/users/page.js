"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  ShieldCheckIcon,
  UserIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Header from '../../../components/Header';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user? They will lose access to the application.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/deactivate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          target_user_id: userId,
          admin_notes: adminNotes
        })
      });

      if (response.ok) {
        await fetchUsers();
        setSelectedUser(null);
        setAdminNotes('');
      } else {
        const error = await response.json();
        alert('Error deactivating user: ' + error.error);
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Error deactivating user');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to permanently delete the user "${userEmail}"? This action cannot be undone.`)) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          target_user_id: userId,
          admin_notes: `User account permanently deleted by admin`
        })
      });

      if (response.ok) {
        await fetchUsers();
        alert('User successfully deleted.');
      } else {
        const error = await response.json();
        alert('Error deleting user: ' + error.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle role assignment
  const handleAssignRole = async () => {
    if (!selectedUser) return;

    setActionLoading(prev => ({ ...prev, [selectedUser.id]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          target_user_id: selectedUser.id,
          new_role: newRole,
          admin_notes: adminNotes
        })
      });

      if (response.ok) {
        await fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
        setAdminNotes('');
        setNewRole('user');
      } else {
        const error = await response.json();
        alert('Error assigning role: ' + error.error);
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Error assigning role');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedUser.id]: false }));
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUsers();
      setLoading(false);
    };

    loadData();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserRole = (user) => {
    const activeRoles = user.roles.filter(r => r.is_active);
    if (activeRoles.some(r => r.role === 'admin')) return 'admin';
    if (activeRoles.some(r => r.role === 'user')) return 'user';
    return 'no role';
  };

  const isUserActive = (user) => {
    return user.roles.some(r => r.is_active);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <Link href="/admin" className="flex items-center text-gray-600 mb-4 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="w-8 h-8 mr-3 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const userRole = getUserRole(user);
                  const active = isUserActive(user);
                  
                  return (
                    <tr key={user.id} className={!active ? 'opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.id === currentUser?.id && '(You)'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
                          {userRole === 'admin' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                          {userRole === 'user' && <UserIcon className="w-3 h-3 mr-1" />}
                          {userRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {user.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(userRole === 'admin' ? 'user' : 'admin');
                                  setShowRoleModal(true);
                                }}
                                className="text-purple-600 hover:text-purple-900"
                                title="Change Role"
                              >
                                <ShieldCheckIcon className="w-4 h-4" />
                              </button>
                              {active && (
                                <button
                                  onClick={() => handleDeactivateUser(user.id)}
                                  disabled={actionLoading[user.id]}
                                  className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                                  title="Deactivate User"
                                >
                                  {actionLoading[user.id] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    <NoSymbolIcon className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={actionLoading[user.id]}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Delete User Permanently"
                              >
                                {actionLoading[user.id] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <TrashIcon className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Change User Role
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User: {selectedUser.email}</p>
                <p className="text-sm text-gray-600 mb-4">Current Role: {getUserRole(selectedUser)}</p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="2"
                  placeholder="Reason for role change..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={actionLoading[selectedUser.id]}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[selectedUser.id] ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    'Assign Role'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <AdminProtectedRoute>
      <UserManagement />
    </AdminProtectedRoute>
  );
}