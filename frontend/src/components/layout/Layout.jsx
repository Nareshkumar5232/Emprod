// src/components/layout/Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const sideW = collapsed ? 'w-16' : 'w-56';
  const marginL = collapsed ? 'ml-16' : 'ml-56';

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${marginL}`}>
        <Outlet />
      </main>
    </div>
  );
}
