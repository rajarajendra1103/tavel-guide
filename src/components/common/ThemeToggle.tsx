import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {theme === 'light' ? <Moon size={18} className="w-5 h-5" /> : <Sun size={18} className="w-5 h-5" />}
    </button>
  );
};
