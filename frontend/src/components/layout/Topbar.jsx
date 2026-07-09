// src/components/layout/Topbar.jsx
import { Sun, Moon, Bell, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Topbar({ title, subtitle }) {
  const { dark, toggle } = useTheme();
  return (
    <header
      style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5"
    >
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-slate-100 dark:hover:bg-slate-800"
          style={{ color: 'var(--text-muted)' }}
          title={dark ? 'Switch to Light' : 'Switch to Dark'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-muted)' }}>
          <Bell size={16} />
        </button>

        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center ml-1">
          <User size={14} className="text-white" />
        </div>
      </div>
    </header>
  );
}
