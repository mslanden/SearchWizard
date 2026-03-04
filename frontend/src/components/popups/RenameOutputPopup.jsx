"use client";
import { useState } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

/**
 * RenameOutputPopup — allows the user to rename a generated output document.
 *
 * @param {{ output: { id: string, name: string }, onClose: () => void, onSave: (id: string, name: string) => Promise<void> }} props
 */
export default function RenameOutputPopup({ output, onClose, onSave }) {
  const [name, setName] = useState(output?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Document name cannot be empty.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave(output.id, trimmed);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to rename document.');
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-md bg-[#E6F0FF] p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <PencilIcon className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            <h2 className="text-xl font-bold" style={{ color: '#8B5CF6' }}>
              Rename Document
            </h2>
          </div>
          <button className="p-1 rounded-full hover:bg-gray-100" onClick={onClose}>
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            autoFocus
            className="block w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: saving ? '#9CA3AF' : '#8B5CF6' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
