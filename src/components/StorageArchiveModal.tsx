'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Archive,
  Trash2,
  CheckCircle,
  RotateCcw,
  SquarePlay,
  BookOpen,
  CheckSquare,
  Clock,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { BacklogItem, ItemStatus, ItemType } from '@/types';
import { formatMinutes } from '@/lib/utils';
import { ReaderModal } from './ReaderModal';

interface StorageArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export function StorageArchiveModal({ isOpen, onClose, onDataChanged }: StorageArchiveModalProps) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('inbox');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readerItem, setReaderItem] = useState<BacklogItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error loading archive items:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, fetchItems]);

  if (!isOpen) return null;

  const handleStatusChange = async (id: string, newStatus: ItemStatus) => {
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchItems();
        onDataChanged();
      }
    } catch (err) {
      console.error('Error changing item status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите окончательно удалить этот элемент?')) return;
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchItems();
        onDataChanged();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesTitle = item.title.toLowerCase().includes(q);
    const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
    return matchesTitle || matchesTags;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:max-w-4xl sm:h-[90vh] bg-slate-950 sm:border sm:border-slate-800 rounded-none sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Архив бэклога («Storage Archive»)
              </h2>
              <p className="text-[11px] text-slate-400">
                Полная база сохраненных материалов и выполненных дел
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label="Закрыть архив"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:px-6 bg-slate-900/50 border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto">
              {[
                { id: 'inbox', label: 'В бэклоге' },
                { id: 'completed', label: 'Выполненные' },
                { id: 'dismissed', label: 'Выброшенные' },
                { id: 'all', label: 'Все' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as ItemStatus | 'all')}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или тегам..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              <span>Тип:</span>
            </span>
            {[
              { id: 'all', label: 'Все' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'article', label: 'Статьи' },
              { id: 'custom_task', label: 'Задачи' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id as ItemType | 'all')}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'text-slate-400 border-transparent hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Загрузка бэклога...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <Archive className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-400">Список пуст</p>
              <p className="text-xs text-slate-600 mt-1">
                Нет элементов, соответствующих выбранным фильтрам
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Type Icon */}
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === 'youtube' && <SquarePlay className="w-4 h-4 text-red-400" />}
                    {item.type === 'article' && <BookOpen className="w-4 h-4 text-blue-400" />}
                    {item.type === 'custom_task' && <CheckSquare className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate leading-snug">
                      {item.title}
                    </h4>

                    {item.ai_summary && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {item.ai_summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatMinutes(item.estimated_minutes)}</span>
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.energy_level} энергия</span>
                      {item.tags?.map((t, idx) => (
                        <span key={idx} className="text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {item.type === 'article' && (
                    <button
                      type="button"
                      onClick={() => setReaderItem(item)}
                      className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Открыть режим чтения"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Читать</span>
                    </button>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                      title="Ссылка"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {item.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'completed')}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 flex items-center justify-center transition-colors"
                      title="Отметить как выполненное"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'inbox')}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 flex items-center justify-center transition-colors"
                      title="Вернуть в бэклог"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 flex items-center justify-center transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReaderModal
        item={readerItem}
        isOpen={!!readerItem}
        onClose={() => setReaderItem(null)}
      />
    </div>
  );
}
