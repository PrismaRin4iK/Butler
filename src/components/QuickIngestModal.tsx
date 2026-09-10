'use client';

import React, { useState } from 'react';
import { Plus, X, Link, SquarePlay, BookOpen, CheckSquare, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { isYouTubeUrl } from '@/lib/parsers/youtube';
import { isHttpUrl } from '@/lib/parsers/article';
import { ItemType } from '@/types';

interface QuickIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: () => void;
}

export function QuickIngestModal({ isOpen, onClose, onItemCreated }: QuickIngestModalProps) {
  const [input, setInput] = useState('');
  const [customMinutes, setCustomMinutes] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmed = input.trim();
  const isYt = isYouTubeUrl(trimmed);
  const isArt = !isYt && isHttpUrl(trimmed);
  const isTask = trimmed.length > 0 && !isYt && !isArt;

  const detectedType: ItemType | 'unknown' = isYt
    ? 'youtube'
    : isArt
    ? 'article'
    : isTask
    ? 'custom_task'
    : 'unknown';

  const timePresets = [5, 15, 30, 60];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setError('Пожалуйста, введите ссылку или название задачи');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/items/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          customMinutes: isTask ? customMinutes : undefined,
          rawContent: isTask && notes.trim() ? notes.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при сохранении элемента');
      }

      setInput('');
      setNotes('');
      setCustomMinutes(undefined);
      onClose();
      onItemCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet */}
      <div
        className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Добавить в бэклог
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Умный ввод (URL или задача)
            </label>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                rows={2}
                placeholder="Вставьте ссылку на YouTube, статью или напишите задачу..."
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-500 resize-none transition-all"
                autoFocus
              />
            </div>

            {/* Live Type Detection Indicator */}
            {trimmed.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-500">Определено как:</span>
                {detectedType === 'youtube' && (
                  <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                    <SquarePlay className="w-3.5 h-3.5" />
                    <span>YouTube видео / плейлист</span>
                  </span>
                )}
                {detectedType === 'article' && (
                  <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Статья для чтения</span>
                  </span>
                )}
                {detectedType === 'custom_task' && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Пользовательская задача</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Time Selector for Tasks */}
          {isTask && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Оценка времени (минут)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timePresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomMinutes(customMinutes === mins ? undefined : mins)}
                    className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      customMinutes === mins
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {mins} мин
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {customMinutes
                  ? `Выбрано ${customMinutes} мин.`
                  : 'Если не выбрать, Gemini оценит длительность автоматически.'}
              </p>

              {/* Optional task notes */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Заметки / описание (опционально)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительные детали задачи..."
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* AI Info Notice */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Gemini 2.5 Flash автоматически проанализирует контент, определит требуемый уровень энергии, добавит теги и сформулирует мотивирующий микро-хук.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !trimmed}
              className="min-h-[48px] w-full px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Обработка дворецким...</span>
                </div>
              ) : (
                <span>Сохранить в бэклог</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
