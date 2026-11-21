'use client';

import { useState } from 'react';

/** Shared collapsed "More options" section used by both Create and Edit workout. */
export default function MoreOptionsSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line-2 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between text-left text-sm font-bold text-ink"
      >
        <span>More options</span>
        <span aria-hidden="true" className="text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="space-y-5 pt-3">{children}</div>}
    </div>
  );
}
