'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles, Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import { Header } from '../components/Header';
import { ButlerDesk } from '../components/ButlerDesk';
import { FocusCard } from '../components/FocusCard';
import { QuickIngestModal } from '../components/QuickIngestModal';
import { StorageArchiveModal } from '../components/StorageArchiveModal';
import { BacklogItem, EnergyLevel, ItemType, RecommendResponse } from '../types';

export default function HomePage() {
  // Butler Desk Configuration State
  const [availableMinutes, setAvailableMinutes] = useState<number>(20);
  const [energyState, setEnergyState] = useState<EnergyLevel>('medium');
  const [preferredType, setPreferredType] = useState<'all' | ItemType>('all');

  // Recommendation & UI State
  const [currentRecommendation, setCurrentRecommendation] = useState<BacklogItem | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isEmptyPool, setIsEmptyPool] = useState<boolean>(false);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState<boolean>(false);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);

  // Modals
  const [isIngestOpen, setIsIngestOpen] = useState<boolean>(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState<boolean>(false);

  // Statistics / Counters
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch count of items in inbox
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/items?status=inbox');
      if (res.ok) {
        const data = await res.json();
        setInboxCount(data.items?.length || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Request Butler Recommendation
  const handleRequestRecommendation = async (excludeCurrent = false) => {
    setIsLoadingRecommendation(true);
    setIsEmptyPool(false);

    try {
      const currentExcluded = excludeCurrent && currentRecommendation
        ? [...seenIds, currentRecommendation.id]
        : seenIds;

      const res = await fetch('/api/butler/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableMinutes,
          energyState,
          preferredType: preferredType === 'all' ? undefined : preferredType,
          excludeIds: currentExcluded,
        }),
      });

      const data: RecommendResponse = await res.json();

      if (data.status === 'EMPTY_POOL' || !data.item) {
        setIsEmptyPool(true);
        setCurrentRecommendation(null);
      } else {
        setCurrentRecommendation(data.item);
        setSeenIds((prev) => (prev.includes(data.item!.id) ? prev : [...prev, data.item!.id]));
        setIsEmptyPool(false);
      }
    } catch (err) {
      console.error('Failed to get recommendation:', err);
      showToast('Ошибка связи с дворецким');
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Action: Mark Complete
  const handleComplete = async (id: string) => {
    setIsLoadingAction(true);
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (res.ok) {
        showToast('Отлично сработано! Активность перенесена в выполненные 🎉');
        refreshStats();
        // Automatically ask Butler for next recommendation or return to desk
        handleRequestRecommendation(true);
      }
    } catch (err) {
      console.error('Error completing item:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Action: Dismiss
  const handleDismiss = async (id: string) => {
    setIsLoadingAction(true);
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (res.ok) {
        showToast('Элемент выброшен из бэклога');
        refreshStats();
        handleRequestRecommendation(true);
      }
    } catch (err) {
      console.error('Error dismissing item:', err);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Action: Skip to Next Option
  const handleNext = async () => {
    setIsLoadingAction(true);
    await handleRequestRecommendation(true);
    setIsLoadingAction(false);
  };

  const handleBackToDesk = () => {
    setCurrentRecommendation(null);
    setIsEmptyPool(false);
    setSeenIds([]);
  };

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        onOpenArchive={() => setIsArchiveOpen(true)}
        onOpenIngest={() => setIsIngestOpen(true)}
        inboxCount={inboxCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10 max-w-4xl mx-auto w-full">
        {/* State 1: Active Focus Card */}
        {currentRecommendation ? (
          <FocusCard
            item={currentRecommendation}
            onComplete={handleComplete}
            onNext={handleNext}
            onDismiss={handleDismiss}
            onBackToDesk={handleBackToDesk}
            isLoadingAction={isLoadingAction}
          />
        ) : isEmptyPool ? (
          /* State 2: Empty Pool State */
          <div className="w-full max-w-md mx-auto text-center p-8 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Подходящих задач не найдено
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              В вашем бэклоге нет невыполненных материалов, укладывающихся в {availableMinutes} мин с уровнем энергии «{energyState}».
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsIngestOpen(true)}
                className="min-h-[44px] w-full px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Добавить новый материал</span>
              </button>

              <button
                type="button"
                onClick={handleBackToDesk}
                className="min-h-[44px] w-full px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Выбрать другое окно времени</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Butler Desk Selector */
          <div className="w-full">
            <ButlerDesk
              availableMinutes={availableMinutes}
              setAvailableMinutes={setAvailableMinutes}
              energyState={energyState}
              setEnergyState={setEnergyState}
              preferredType={preferredType}
              setPreferredType={setPreferredType}
              onRequestRecommendation={() => handleRequestRecommendation(false)}
              isLoading={isLoadingRecommendation}
            />

            {/* Hint if inbox is completely empty */}
            {inboxCount === 0 && (
              <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Ваш бэклог пока пуст. Нажмите кнопку «+» или «Добавить», чтобы вставить YouTube-видео, статью или задачу.
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button for Quick Ingest (Mobile & Tablet) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsIngestOpen(true)}
          className="min-h-[56px] min-w-[56px] rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-500/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer group"
          title="Быстрое добавление в бэклог"
          aria-label="Добавить ссылку или задачу"
        >
          <Plus className="w-6 h-6 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Modals */}
      <QuickIngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onItemCreated={() => {
          showToast('Материал сохранен и проанализирован Groq AI!');
          refreshStats();
        }}
      />

      <StorageArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onDataChanged={refreshStats}
      />
    </div>
  );
}
