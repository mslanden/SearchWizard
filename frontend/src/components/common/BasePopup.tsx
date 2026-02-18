import React, { useEffect, useRef, ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BasePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  preventCloseOnEscape?: boolean;
  preventCloseOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

const BasePopup: React.FC<BasePopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
  preventCloseOnEscape = false,
  preventCloseOnBackdrop = false,
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      // Restore focus when closing
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && !preventCloseOnEscape) {
        onClose();
      }

      // Focus trap
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, preventCloseOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full m-4';
      default:
        return 'max-w-lg';
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !preventCloseOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`
          relative w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl
          transform transition-all duration-200 ease-out
          ${getSizeClasses()}
          ${className}
        `}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-dark-text"
          >
            {title}
          </h2>
          
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-dark-text-secondary" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BasePopup;