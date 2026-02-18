/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'brand-purple': '#8A55FF',
        'brand-purple-light': '#A478FF',
        'brand-purple-dark': '#6B3ACC',
        
        // Light theme colors
        'light-cream': '#FFF5E6',
        'light-green': '#E6FFE6',
        'light-pink': '#FFE6E6',
        'light-blue': '#E6F0FF',
        'light-gray': '#F5F5F5',
        
        // Dark theme colors
        'dark-bg': '#0F172A',
        'dark-bg-secondary': '#1E293B',
        'dark-bg-tertiary': '#334155',
        'dark-surface': '#475569',
        'dark-border': '#64748B',
        'dark-text': '#F1F5F9',
        'dark-text-secondary': '#CBD5E1',
        'dark-text-muted': '#94A3B8',
        
        // Dark theme accent colors
        'dark-cream': '#2D1810',
        'dark-green': '#0F2A0F',
        'dark-pink': '#2A0F0F',
        'dark-blue': '#0F1A2A',
        'dark-gray': '#1A1A1A',
      },
      // Enhanced form styling
      ringColor: {
        'brand-purple': '#8A55FF',
      },
      focusRingColor: {
        'brand-purple': '#8A55FF',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
