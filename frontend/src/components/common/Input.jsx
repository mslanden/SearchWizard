'use client';

import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({
  className,
  type = 'text',
  error,
  label,
  required,
  ...props
}, ref) => {
  const baseClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple
    transition-colors duration-200
    text-gray-900 dark:text-dark-text
    bg-white dark:bg-dark-bg-secondary
    border-gray-300 dark:border-dark-border
    hover:border-gray-400 dark:hover:border-dark-surface
  `;

  const errorClasses = error 
    ? 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500' 
    : '';

  const inputClasses = cn(baseClasses, errorClasses, className);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;