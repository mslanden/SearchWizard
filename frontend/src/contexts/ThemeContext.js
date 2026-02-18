'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      
      // Use saved theme, or fall back to system preference
      const initialTheme = savedTheme || systemPreference;
      setTheme(initialTheme);
      
      // Apply theme to document
      applyTheme(initialTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
      // Fallback to light theme
      setTheme('light');
      applyTheme('light');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply theme to document root
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Set specific theme
  const setThemeValue = (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') {
      console.error('Invalid theme value. Must be "light" or "dark"');
      return;
    }
    
    setTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const value = {
    theme,
    toggleTheme,
    setTheme: setThemeValue,
    isLoading,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};