'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ContextPanel } from './ContextPanel';
import { ContextPanelProvider } from '@/context/ContextPanelContext';
import { Toaster } from 'sonner';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ContextPanelProvider>
      <div className="flex h-screen w-full bg-[#080c14] text-slate-100 overflow-hidden font-sans">
        {/* Left Zone: Sidebar (240px fixed) */}
        <Sidebar />

        {/* Center Zone: Fluid Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Right Zone: Sliding Context Panel (400px) */}
        <ContextPanel />

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Toaster for Toast Notifications */}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1526',
              border: '1px solid #1e293b',
              color: '#f8fafc',
            },
          }}
        />
      </div>
    </ContextPanelProvider>
  );
}

