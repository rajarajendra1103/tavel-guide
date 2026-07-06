import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MessageSquare, Bookmark, Truck } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Search',
      icon: Search,
      path: '/search',
    },
    {
      label: 'Transit',
      icon: Truck,
      path: '/transport',
    },
    {
      label: 'AI Chat',
      icon: MessageSquare,
      path: '/chat',
    },
    {
      label: 'Saved',
      icon: Bookmark,
      path: '/saved',
    },
  ];

  // Do not display bottom nav on the welcome/landing screen
  if (location.pathname === '/') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 px-4 py-2 safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 font-semibold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={20} className="mb-0.5" />
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
