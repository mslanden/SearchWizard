'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastComponentProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent = ({ toast, onClose }: ToastComponentProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Match exit animation duration
  };

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [toast.duration, handleClose]);

  const getIcon = () => {
    const iconClass = "h-6 w-6";
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'error':
        return <ExclamationTriangleIcon className={`${iconClass} text-red-600`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-600`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClass} text-blue-600`} />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isVisible && !isExiting ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'}
        ${isExiting ? 'transform translate-x-full opacity-0' : ''}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {toast.title}
          </h3>
          {toast.message && (
            <p className={`mt-1 text-sm ${getTextColor()} opacity-90`}>
              {toast.message}
            </p>
          )}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={toast.action.onClick}
                className={`
                  text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${getTextColor()}
                `}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className={`
              inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${getTextColor()}
            `}
            aria-label="Close notification"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-3 w-full max-w-sm"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export default ToastComponent;