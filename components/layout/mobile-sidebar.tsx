'use client';

import { useState } from 'react';

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#0f3d2e] text-white shadow-lg lg:hidden"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 flex transition lg:hidden ${open ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-[#0f3d2e]/40 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <div className={`relative flex w-[300px] flex-col bg-[#0f3d2e] p-5 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {children}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-[300px] shrink-0 flex-col lg:flex">
        <div className="sticky top-4 rounded-[28px] bg-[#0f3d2e] p-6 text-white shadow-[0_18px_60px_rgba(15,61,46,0.14)]">
          {children}
        </div>
      </aside>
    </>
  );
}
