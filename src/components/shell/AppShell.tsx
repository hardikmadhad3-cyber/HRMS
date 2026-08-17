import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary.js';
import { TopBar } from './TopBar.js';
import { Sidebar } from './Sidebar.js';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Global Top Bar */}
      <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Body with Sidebar + Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
          <div className="flex-1">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span>Human Resource Management System (HRMS) — Enterprise Edition</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span>Status: <strong className="text-emerald-600 font-semibold">Phase 2A — Shift Management & Employee Assignments</strong></span>
              <span>•</span>
              <span>PostgreSQL Architecture</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
