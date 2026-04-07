import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import AndroChatModal from './AndroChatModal';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function AndroChatBar({ projectId }) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSend = async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch(`${BACKEND_URL}/api/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        user_id: user?.id,
        ...payload,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = (() => { try { return JSON.parse(text); } catch { return {}; } })();
      throw new Error(`HTTP ${res.status} → ${res.url.slice(0, 80)}: ${err.detail || text.slice(0, 120) || 'no body'}`);
    }
    return res.json(); // { response, document }
  };

  return (
    <>
      <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
        {/* + icon — decorative */}
        <div className="p-1.5 text-gray-400">
          <PlusIcon className="w-5 h-5" />
        </div>

        {/* Clickable prompt area */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex-1 text-left text-sm text-gray-400 dark:text-dark-text-muted"
        >
          Ask Andro for help with this project...
        </button>

        {/* Ask Andro button */}
        <button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap"
        >
          Ask Andro
        </button>
      </div>

      {modalOpen && (
        <AndroChatModal
          projectId={projectId}
          onClose={() => setModalOpen(false)}
          onSend={handleSend}
        />
      )}
    </>
  );
}
