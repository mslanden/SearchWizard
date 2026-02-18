"use client";

import React, { createContext, useContext, useState } from 'react';

// Create the error context
const ErrorContext = createContext();

// Custom hook to use the error context
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Provider component
export function ErrorProvider({ children }) {
  const [error, setError] = useState(null);

  // Function to handle and log errors
  const handleError = (error, source) => {

    setError({ message: error.message || 'An unexpected error occurred', source });

    // Clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  };

  // Clear error manually
  const clearError = () => {
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ error, handleError, clearError }}>
      {children}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md shadow-lg">
          <div className="flex">
            <div>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error.message}</p>
              <p className="text-xs text-gray-600">Source: {error.source}</p>
            </div>
            <button onClick={clearError} className="ml-auto">×</button>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
}
