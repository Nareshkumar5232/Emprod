// src/components/layout/Sidebar.jsx
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, BrainCircuit, Clock, History,
  ShieldAlert, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/predict',   icon: BrainCircuit,    label: 'Predict' },
  { to: '/recent',    icon: Clock,           label: 'Recent' },
  { to: '/history',   icon: History,         label: 'History' },
  { to: '/admin',     icon: ShieldAlert,     label: 'Admin' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300
        ${collapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 px-4 py-5 border-b-3 border-black hover:bg-slate-100 dark:hover:bg-slate-800/20 transition decoration-transparent text-inherit">
        <div className="w-8 h-8 border-2 border-black bg-yellow-400 flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex-shrink-0">
          <Activity className="text-black stroke-[3.5px]" size={16} />
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden text-black dark:text-white">
            <h1 className="heading-syne text-sm font-extrabold tracking-tight whitespace-nowrap">EmpProd</h1>
            <p className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-500 dark:text-slate-400">MLOps Platform</p>
          </div>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="m-2 flex items-center justify-center h-9 w-9 self-end rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
