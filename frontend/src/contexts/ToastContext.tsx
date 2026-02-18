'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType, ToastContainer } from '../components/common/Toast';

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, options?: Partial<Toast>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  // Convenience methods
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    options: Partial<Toast> = {}
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration: 5000, // Default 5 seconds
      ...options,
    };

    setToasts(prev => [...prev, newToast]);

    // Return the ID so callers can manually dismiss if needed
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string) => {
    showToast('success', title, message);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast('error', title, message, { duration: 7000 }); // Errors stay longer
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast('warning', title, message, { duration: 6000 });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast('info', title, message);
  }, [showToast]);

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Enhanced error handling hook that integrates with toast system
export const useEnhancedErrorHandler = () => {
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  const handleError = useCallback((
    error: Error | string,
    context?: string,
    options?: {
      showToUser?: boolean;
      logToConsole?: boolean;
      action?: { label: string; onClick: () => void };
    }
  ) => {
    const {
      showToUser = true,
      logToConsole = true,
    } = options || {};

    const message = error instanceof Error ? error.message : error;
    const errorContext = context || 'An error occurred';

    // Log to console for debugging
    if (logToConsole) {
      console.error(`Error in ${errorContext}:`, error);
    }

    // Show user-friendly error message
    if (showToUser) {
      showError(
        `Failed to ${errorContext}`,
        message
      );
    }

    // Could integrate with error reporting service here
    // reportError({ error, context, timestamp: new Date() });
  }, [showError]);

  const handleSuccess = useCallback((message: string, details?: string) => {
    showSuccess(message, details);
  }, [showSuccess]);

  const handleWarning = useCallback((message: string, details?: string) => {
    showWarning(message, details);
  }, [showWarning]);

  const handleInfo = useCallback((message: string, details?: string) => {
    showInfo(message, details);
  }, [showInfo]);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    // Direct access to toast methods for custom usage
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

export default ToastProvider;