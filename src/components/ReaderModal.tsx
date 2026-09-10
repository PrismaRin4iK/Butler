'use client';

import React, { useState } from 'react';
import { X, ExternalLink, BookOpen, Type } from 'lucide-react';
import { BacklogItem, ArticleMetadata } from '../types';
import { formatMinutes } from '../lib/utils';

interface ReaderModalProps {
  item: BacklogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReaderModal({ item, isOpen, onClose }: ReaderModalProps) {
  const [fontSizeIndex, setFontSizeIndex] = useState<number>(1); // 0: sm, 1: base, 2: lg, 3: xl
  const fontSizes = ['text-base', 'text-lg', 'text-xl', 'text-2xl'];
  const fontLabels = ['Обычный', 'Крупный', 'Большой', 'Очень большой'];

  if (!isOpen || !item) return null;

  const metadata = ((item.source_metadata || {}) as unknown) as ArticleMetadata;
  const domain = metadata.domain || (item.url ? new URL(item.url).hostname : 'Статья');

  const cycleFontSize = () => {
    setFontSizeIndex((prev) => (prev + 1) % fontSizes.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full h-full md:max-w-3xl md:h-[90vh] bg-slate-950 border-0 md:border md:border-slate-800 rounded-none md:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-mono truncate block">
                {domain} • {formatMinutes(item.estimated_minutes)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title={`Размер шрифта: ${fontLabels[fontSizeIndex]}`}
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">{fontLabels[fontSizeIndex]}</span>
            </button>

            {/* External Link */}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Открыть оригинал"
                aria-label="Открыть оригинал в новой вкладке"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Закрыть режим чтения"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Reader Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 bg-slate-950">
          <article className="max-w-2xl mx-auto">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
              {item.title}
            </h1>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pb-6 mb-8 border-b border-slate-850">
              {metadata.author && <span>Автор: {metadata.author}</span>}
              <span>•</span>
              <span>Время чтения ~{formatMinutes(item.estimated_minutes)}</span>
            </div>

            {/* AI Summary Quote */}
            {item.ai_summary && (
              <div className="p-4 mb-8 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-sm leading-relaxed">
                <span className="font-semibold block text-xs uppercase tracking-wider text-emerald-400 mb-1">
                  Заметка дворецкого:
                </span>
                «{item.ai_summary}»
              </div>
            )}

            {/* Main Text Content */}
            {item.raw_content ? (
              <div
                className={`prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-5 ${fontSizes[fontSizeIndex]} [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-100 [&_p]:leading-relaxed [&_a]:text-emerald-400 [&_a]:underline [&_img]:rounded-xl [&_img]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
                dangerouslySetInnerHTML={{ __html: item.raw_content }}
              />
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="mb-4">Полный текст не был загружен для этого материала.</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 transition-colors"
                  >
                    <span>Читать на сайте первоисточника</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
