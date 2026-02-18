import Link from 'next/link';
import React from 'react';
import { Cog6ToothIcon, UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary transition-colors">
      <div className="flex items-center">
        <Link 
          href="/" 
          className="flex items-center text-xl font-semibold text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-light dark:hover:text-brand-purple transition-colors"
          aria-label="SearchWizard Home"
        >
          <span className="mr-2" role="img" aria-label="sparkles">💫</span> 
          SearchWizard
        </Link>
      </div>
      
      <nav className="flex items-center space-x-2" aria-label="User navigation">
        {isAdmin && (
          <Link 
            href="/admin" 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary relative transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
            title="Admin Dashboard"
            aria-label="Admin Dashboard"
          >
            <ShieldCheckIcon className="w-6 h-6 text-brand-purple dark:text-brand-purple-light" />
            <span 
              className="absolute -top-1 -right-1 w-2 h-2 bg-brand-purple dark:bg-brand-purple-light rounded-full"
              aria-hidden="true"
            />
          </Link>
        )}
        
        <Link 
          href="/settings" 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
          title="Settings"
          aria-label="Settings"
        >
          <Cog6ToothIcon className="w-6 h-6 text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text" />
        </Link>
        
        <Link 
          href="/profile" 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2"
          title="Profile"
          aria-label="User Profile"
        >
          <UserCircleIcon className="w-6 h-6 text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text" />
        </Link>
      </nav>
    </header>
  );
};

export default Header;