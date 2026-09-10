'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  RotateCw,
  Trash2,
  Sparkles,
  SquarePlay,
  BookOpen,
  CheckSquare,
  Clock,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { BacklogItem, YouTubeMetadata, ArticleMetadata } from '../types';
import { TaskTimer } from './TaskTimer';
import { ReaderModal } from './ReaderModal';
import { formatMinutes } from '../lib/utils';

interface FocusCardProps {
  item: BacklogItem;
  onComplete: (id: string) => Promise<void>;
  onNext: () => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onBackToDesk: () => void;
  isLoadingAction?: boolean;
}

export function FocusCard({
  item,
  onComplete,
  onNext,
  onDismiss,
  onBackToDesk,
  isLoadingAction = false,
}: FocusCardProps) {
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Extract source specifics
  const youtubeMeta = item.type === 'youtube' ? (item.source_metadata as unknown as YouTubeMetadata) : null;
  const articleMeta = item.type === 'article' ? (item.source_metadata as unknown as ArticleMetadata) : null;

  const videoId =
    youtubeMeta?.video_id ||
    (item.url ? new URL(item.url).searchParams.get('v') : null);

  const channelOrDomain =
    youtubeMeta?.channel ||
    articleMeta?.domain ||
    (item.url ? new URL(item.url).hostname.replace('www.', '') : 'Персональная задача');

  const getTypeBadge = () => {
    switch (item.type) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <SquarePlay className="w-3.5 h-3.5" />
            <span>Видео</span>
          </span>
        );
      case 'article':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Статья</span>
          </span>
        );
      case 'custom_task':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Задача</span>
          </span>
        );
    }
  };

  const getEnergyBadge = () => {
    switch (item.energy_level) {
      case 'low':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-400 border border-sky-800/40">
            Легко
          </span>
        );
      case 'medium':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/40">
            Средне
          </span>
        );
      case 'high':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-400 border border-purple-800/40">
            Интенсивно
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* Top back button */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={onBackToDesk}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Изменить параметры дворецкого</span>
        </button>
      </div>

      {/* Main Focus Card Container */}
      <div className="relative bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Badges & Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {getTypeBadge()}
            {getEnergyBadge()}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatMinutes(item.estimated_minutes)}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="truncate max-w-[140px] text-slate-400 font-mono">
              {channelOrDomain}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-4 leading-snug">
          {item.title}
        </h2>

        {/* AI Micro-hook block */}
        {item.ai_summary && (
          <div className="p-4 mb-5 rounded-2xl bg-emerald-950/25 border border-emerald-500/20 text-emerald-200/90 text-sm leading-relaxed flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-0.5">
                Почему сейчас:
              </span>
              <span>«{item.ai_summary}»</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {item.tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Interactive Content Area */}
        <div className="mb-6">
          {/* YouTube Video Player */}
          {item.type === 'youtube' && videoId && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* Article Actions */}
          {item.type === 'article' && (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200 block mb-1">
                  Материал готов к чтению
                </span>
                <span>Чистый текст сохранен без рекламы и баннеров.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReaderOpen(true)}
                  className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Читать здесь</span>
                </button>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Открыть первоисточник"
                    aria-label="Открыть первоисточник в новой вкладке"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Custom Task: Interactive Timer */}
          {item.type === 'custom_task' && (
            <TaskTimer
              initialMinutes={item.estimated_minutes}
              taskTitle={item.title}
              onComplete={() => onComplete(item.id)}
            />
          )}
        </div>

        {/* Action Bar (Mobile: vertical stack, Desktop: horizontal row) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-800/80">
          {/* Primary Action: Completed */}
          <button
            type="button"
            disabled={isLoadingAction}
            onClick={() => onComplete(item.id)}
            className="min-h-[44px] flex-1 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Выполнено</span>
          </button>

          {/* Secondary Action: Next Alternative */}
          <button
            type="button"
            disabled={isLoadingAction}
            onClick={onNext}
            className="min-h-[44px] flex-1 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700/60 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Другое</span>
          </button>

          {/* Destructive Action: Dismiss */}
          <button
            type="button"
            disabled={isLoadingAction}
            onClick={() => onDismiss(item.id)}
            className="min-h-[44px] sm:px-4 py-3 rounded-2xl bg-transparent hover:bg-red-500/10 disabled:opacity-50 text-red-400 hover:text-red-300 font-medium text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Выбросить из бэклога"
          >
            <Trash2 className="w-4 h-4" />
            <span>Выбросить</span>
          </button>
        </div>
      </div>

      {/* Reader Mode Modal */}
      <ReaderModal
        item={item}
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
      />
    </div>
  );
}
