'use client';

import React from 'react';
import { Archive, Plus, Compass } from 'lucide-react';

interface HeaderProps {
  onOpenArchive: () => void;
  onOpenIngest: () => void;
  inboxCount?: number;
}

export function Header({ onOpenArchive, onOpenIngest, inboxCount }: HeaderProps) {
  return (
    <header className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between border-b border-slate-800/80 mb-6">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950">
          <Compass className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">
              Butler
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold uppercase tracking-wider">
              AI Desk
            </span>
          </div>
          <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
            Персональный дворецкий внимания
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Archive Button */}
        <button
          type="button"
          onClick={onOpenArchive}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          title="Открыть скрытый архив бэклога"
        >
          <Archive className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Архив</span>
          {typeof inboxCount === 'number' && inboxCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-400 font-mono text-[10px] border border-slate-700">
              {inboxCount}
            </span>
          )}
        </button>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={onOpenIngest}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить</span>
        </button>
      </div>
    </header>
  );
}
