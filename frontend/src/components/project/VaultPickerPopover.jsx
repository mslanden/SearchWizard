"use client";

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, ArchiveBoxIcon, XMarkIcon } from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/**
 * VaultPickerPopover
 *
 * A compact popover anchored above the "+" button that lets the user
 * search and select artifacts from the project vault to include as
 * context in their next Andro message.
 *
 * Props:
 *   projectId    — string — used to fetch the artifact list
 *   selected     — { id, name }[] — currently selected artifacts
 *   onConfirm    — ({ id, name }[]) => void — called with final selection
 *   onClose      — () => void — called on Escape or close button
 */
export default function VaultPickerPopover({ projectId, selected, onConfirm, onClose }) {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(() => new Set(selected.map((a) => a.id)));
  const [artifactMap, setArtifactMap] = useState({});

  const searchRef = useRef(null);
  const popoverRef = useRef(null);

  // Focus search input on open
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch artifacts from project vault
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`${BACKEND_URL}/api/projects/${projectId}/artifacts`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load vault');
        return r.json();
      })
      .then((data) => {
        const list = data.artifacts || [];
        setArtifacts(list);
        const map = {};
        list.forEach((a) => { map[a.id] = a; });
        setArtifactMap(map);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [projectId]);

  const filtered = artifacts.filter((a) =>
    a.name?.toLowerCase().includes(query.toLowerCase()) ||
    a.artifact_type?.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selections = [...checked]
      .map((id) => artifactMap[id])
      .filter(Boolean)
      .map((a) => ({ id: a.id, name: a.name }));
    onConfirm(selections);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-xl z-20 flex flex-col"
      style={{ maxHeight: '340px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
        <span className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary uppercase tracking-wide">Project Vault</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary text-gray-400">
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-md px-2.5 py-1.5">
          <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vault..."
            className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-dark-text placeholder-gray-400"
          />
        </div>
      </div>

      {/* Artifact list */}
      <div className="flex-1 overflow-y-auto px-2 pb-1">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-4">Loading vault...</p>
        )}
        {error && (
          <p className="text-xs text-red-500 text-center py-4">{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No artifacts found.</p>
        )}
        {!loading && !error && filtered.map((artifact) => (
          <label
            key={artifact.id}
            className="flex items-start gap-2.5 w-full px-1.5 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked.has(artifact.id)}
              onChange={() => toggle(artifact.id)}
              className="mt-0.5 flex-shrink-0 accent-gray-900"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-dark-text truncate">{artifact.name}</p>
              {artifact.artifact_type && (
                <p className="text-xs text-gray-400 dark:text-dark-text-muted">{artifact.artifact_type}</p>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 dark:border-dark-border flex-shrink-0">
        <span className="text-xs text-gray-400">{checked.size} selected</span>
        <button
          onClick={handleConfirm}
          className="text-xs font-medium bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
