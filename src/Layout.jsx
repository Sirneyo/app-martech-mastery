import React from 'react';
import Sidebar from '@/components/Sidebar';

export default function Layout({ children, currentPageName }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar currentPageName={currentPageName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}