"use client";

import Link from 'next/link';
import { ArrowLeftIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme, isLoading } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link href="/" className="flex items-center text-gray-600 dark:text-dark-text-secondary mb-6 hover:text-gray-900 dark:hover:text-dark-text transition-colors">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to projects
        </Link>

        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-sm p-6 max-w-3xl mx-auto transition-colors">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">Settings</h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-800 dark:text-dark-text-secondary mb-4">Appearance</h2>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-tertiary transition-colors">
              <div className="flex items-center">
                {theme === 'light' ? (
                  <SunIcon className="w-6 h-6 text-yellow-500 mr-3" />
                ) : (
                  <MoonIcon className="w-6 h-6 text-blue-400 dark:text-blue-300 mr-3" />
                )}
                <div>
                  <p className="font-medium text-gray-700 dark:text-dark-text">{theme === 'light' ? 'Light' : 'Dark'} Mode</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                    {theme === 'light' 
                      ? 'Use light mode for a brighter display' 
                      : 'Use dark mode for reduced eye strain in low light'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-dark-surface peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-purple/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple"></div>
              </label>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-medium text-gray-700 dark:text-dark-text-secondary mb-4">AI Agent Options</h2>
            <div className="bg-gray-100 dark:bg-dark-bg-tertiary border dark:border-dark-border p-4 rounded-lg text-center transition-colors">
              <p className="text-gray-600 dark:text-dark-text-muted">Additional agent options will be available in future updates.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
