"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Header from '../../../components/Header';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';
import { supabase } from '../../../lib/supabase';

const CATEGORIES = [
  { id: 'company', label: 'Company' },
  { id: 'role', label: 'Role' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'process', label: 'Interviewer' },
  { id: 'golden', label: 'Golden Examples' }
];

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function ArtifactTypeManagement() {
  const [activeCategory, setActiveCategory] = useState('company');
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editLoading, setEditLoading] = useState(false);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    return { 'Authorization': `Bearer ${session.access_token}` };
  };

  const fetchTypes = async (category) => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/artifact-types?category=${category}`, { headers });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch types');
      }
      const data = await response.json();
      setTypes(data.types || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes(activeCategory);
  }, [activeCategory]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError('Name is required');
      return;
    }

    const id = slugify(newName);
    if (!id) {
      setAddError('Name must contain at least one letter or number');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const headers = await getAuthHeader();
      const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order || 0)) : 0;
      const response = await fetch('/api/admin/artifact-types', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          category: activeCategory,
          name: newName.trim(),
          description: newDescription.trim() || null,
          sort_order: maxOrder + 1
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add type');
      }

      setNewName('');
      setNewDescription('');
      setIsAdding(false);
      await fetchTypes(activeCategory);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (type) => {
    setEditingId(type.id);
    setEditName(type.name);
    setEditDescription(type.description || '');
    setEditSortOrder(type.sort_order || 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditSortOrder(0);
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setEditLoading(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch('/api/admin/artifact-types', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          description: editDescription.trim() || null,
          sort_order: Number(editSortOrder)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update type');
      }

      setEditingId(null);
      await fetchTypes(activeCategory);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/admin/artifact-types?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete type');
      }

      await fetchTypes(activeCategory);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <Link href="/admin" className="flex items-center text-gray-600 mb-4 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TagIcon className="w-8 h-8 mr-3 text-purple-600" />
            Manage Artifact Types
          </h1>
          <p className="text-gray-600 mt-2">Configure the artifact type options shown to users across each section</p>
        </div>

        {/* Category tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setIsAdding(false);
                  setEditingId(null);
                  setError('');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeCategory === cat.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Types table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {CATEGORIES.find(c => c.id === activeCategory)?.label} Types
            </h2>
            <button
              onClick={() => { setIsAdding(true); setEditingId(null); setAddError(''); }}
              className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Type
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID (slug)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Order</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {types.map(type => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    {editingId === type.id ? (
                      <>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="block w-full mt-1 border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 font-mono">{type.id}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={editSortOrder}
                            onChange={e => setEditSortOrder(e.target.value)}
                            className="block w-16 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleSaveEdit(type.id)}
                              disabled={editLoading}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-400 hover:text-gray-600"
                              title="Cancel"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium text-gray-900">{type.name}</div>
                          {type.description && (
                            <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 font-mono">{type.id}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{type.sort_order ?? 0}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => startEdit(type)}
                              className="text-purple-600 hover:text-purple-800"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(type.id, type.name)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {/* Add new type row */}
                {isAdding && (
                  <tr className="bg-purple-50">
                    <td className="px-6 py-3" colSpan={2}>
                      <form onSubmit={handleAdd}>
                        <input
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="Type name (required)"
                          autoFocus
                          className="block w-full border border-purple-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          value={newDescription}
                          onChange={e => setNewDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="block w-full mt-1 border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {newName && (
                          <div className="text-xs text-gray-400 mt-1">
                            ID: <span className="font-mono">{slugify(newName)}</span>
                          </div>
                        )}
                        {addError && (
                          <div className="text-xs text-red-600 mt-1">{addError}</div>
                        )}
                      </form>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">auto</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={handleAdd}
                          disabled={addLoading}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Add"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setIsAdding(false); setNewName(''); setNewDescription(''); setAddError(''); }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {types.length === 0 && !isAdding && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No types configured. Click "Add Type" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ArtifactTypesPage() {
  return (
    <AdminProtectedRoute>
      <ArtifactTypeManagement />
    </AdminProtectedRoute>
  );
}
