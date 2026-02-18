'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send error to logging service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-gray-100 dark:bg-dark-bg-tertiary rounded p-3 text-xs font-mono overflow-auto max-h-32">
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-gray-600 dark:text-dark-text-secondary">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Refresh Page
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 text-brand-purple hover:text-brand-purple-dark underline focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
              >
                Go to Home Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// React 18+ hook-based alternative (for future migration)
export const ErrorBoundaryHook: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  // This would use React 18's error boundary hooks when they're stable
  // For now, we'll stick with the class component approach
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;