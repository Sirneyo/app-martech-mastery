import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-slate-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 z-50 p-1 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
          <Sidebar currentPageName={currentPageName} onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      <main className="flex-1 h-screen overflow-y-auto lg:ml-0">
        {children}
      </main>
    </div>
  );
}