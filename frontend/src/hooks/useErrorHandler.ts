import { useState, useCallback } from 'react';
import { useEnhancedErrorHandler } from '../contexts/ToastContext';

interface ErrorState {
  message: string | null;
  context?: string;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState>({ message: null });
  const { handleError: handleToastError, handleSuccess } = useEnhancedErrorHandler();

  const handleError = useCallback((error: Error | string, context?: string) => {
    // Set local error state for component-specific error handling
    setError({ 
      message: `Failed to ${context || 'complete operation'}. Please try again.`,
      context 
    });

    // Show toast notification
    handleToastError(error, context);

    // Auto-clear local error after 5 seconds
    setTimeout(() => {
      setError({ message: null });
    }, 5000);
  }, [handleToastError]);

  const clearError = useCallback(() => {
    setError({ message: null });
  }, []);

  const showSuccess = useCallback((message: string) => {
    handleSuccess(message);
  }, [handleSuccess]);

  return {
    error: error.message,
    errorContext: error.context,
    handleError,
    clearError,
    showSuccess,
    hasError: !!error.message
  };
};