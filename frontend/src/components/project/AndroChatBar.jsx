import { useState, useRef, useEffect } from 'react';
import { PlusIcon, PaperClipIcon, ArchiveBoxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const menuItems = [
  { label: 'Upload files or photos', icon: PaperClipIcon },
  { label: 'Select from Project Vault', icon: ArchiveBoxIcon },
  { label: 'Web Search', icon: MagnifyingGlassIcon },
];

export default function AndroChatBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
      {/* + button with dropdown */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
          aria-label="Add attachment"
        >
          <PlusIcon className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" />
        </button>
        {dropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-52 bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-md shadow-md z-10">
            {menuItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text input */}
      <input
        type="text"
        placeholder="Ask Andro for help with this project..."
        className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-muted"
      />

      {/* Ask Andro button */}
      <button className="flex-shrink-0 bg-gray-900 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors whitespace-nowrap">
        Ask Andro
      </button>
    </div>
  );
}
