"use client";

import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { isFeatureEnabled } from '../config/features';

export default function AdminSetupNotice() {
  const [dismissed, setDismissed] = useState(false);

  // Only show if admin approval system is not enabled
  if (isFeatureEnabled('adminApprovalSystem') || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <strong>Admin Approval System Setup Required</strong>
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            The admin approval system is not yet configured. To enable it:
          </p>
          <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Run the SQL commands from SUPABASE_ADMIN_APPROVAL_GUIDE.md in your Supabase SQL editor</li>
            <li>Create your first admin user using the guide</li>
            <li>Set <code className="bg-yellow-100 px-1 rounded">adminApprovalSystem: true</code> in src/config/features.js</li>
          </ol>
          <p className="mt-2 text-sm text-yellow-600">
            Until then, all users can access the application normally.
          </p>
        </div>
        <div className="ml-3">
          <button
            onClick={() => setDismissed(true)}
            className="text-yellow-400 hover:text-yellow-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}