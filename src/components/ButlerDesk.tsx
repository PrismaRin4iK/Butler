'use client';

import React from 'react';
import { Sparkles, BatteryCharging, BatteryLow, BatteryMedium, SquarePlay, BookOpen, CheckSquare, Layers, Clock } from 'lucide-react';
import { EnergyLevel, ItemType } from '@/types';

interface ButlerDeskProps {
  availableMinutes: number;
  setAvailableMinutes: (minutes: number) => void;
  energyState: EnergyLevel;
  setEnergyState: (energy: EnergyLevel) => void;
  preferredType: 'all' | ItemType;
  setPreferredType: (type: 'all' | ItemType) => void;
  onRequestRecommendation: () => void;
  isLoading: boolean;
}

export function ButlerDesk({
  availableMinutes,
  setAvailableMinutes,
  energyState,
  setEnergyState,
  preferredType,
  setPreferredType,
  onRequestRecommendation,
  isLoading,
}: ButlerDeskProps) {
  const timeOptions = [
    { value: 10, label: '10 мин', desc: 'Быстрый перерыв' },
    { value: 20, label: '20 мин', desc: 'Короткий фокус' },
    { value: 45, label: '45 мин', desc: 'Глубокое погружение' },
    { value: 60, label: '60+ мин', desc: 'Большой блок' },
  ];

  const energyOptions: Array<{
    value: EnergyLevel;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    activeBg: string;
  }> = [
    {
      value: 'low',
      label: 'Устал',
      sublabel: 'Легкий контент',
      icon: <BatteryLow className="w-4 h-4 text-sky-400" />,
      color: 'text-sky-300',
      activeBg: 'bg-sky-950/60 border-sky-500/50 shadow-sky-900/30 text-sky-200',
    },
    {
      value: 'medium',
      label: 'В норме',
      sublabel: 'Обычный темп',
      icon: <BatteryMedium className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-300',
      activeBg: 'bg-amber-950/60 border-amber-500/50 shadow-amber-900/30 text-amber-200',
    },
    {
      value: 'high',
      label: 'Заряжен',
      sublabel: 'Максимум фокуса',
      icon: <BatteryCharging className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-300',
      activeBg: 'bg-emerald-950/60 border-emerald-500/50 shadow-emerald-900/30 text-emerald-200',
    },
  ];

  const typeOptions: Array<{ value: 'all' | ItemType; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: 'Все', icon: <Layers className="w-3.5 h-3.5" /> },
    { value: 'youtube', label: 'Видео', icon: <SquarePlay className="w-3.5 h-3.5" /> },
    { value: 'article', label: 'Статьи', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { value: 'custom_task', label: 'Дела', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full max-w-xl mx-auto animate-in fade-in duration-300">
      {/* Container with sleek dark card styling */}
      <div className="relative bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Question */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ваш персональный дворецкий</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Сколько у вас есть времени?
          </h2>
          <p className="text-sm text-slate-400">
            Никаких бесконечных списков. Выберите параметры — дворецкий предложит ровно одну активность.
          </p>
        </div>

        {/* 1. Time Selector (Time Chips) */}
        <div className="mb-7">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Окно времени</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {timeOptions.map((opt) => {
              const isSelected = availableMinutes === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAvailableMinutes(opt.value)}
                  className={`min-h-[56px] px-3 py-2.5 rounded-2xl border text-center transition-all duration-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="text-base font-bold leading-tight">{opt.label}</span>
                  <span
                    className={`text-[10px] mt-0.5 ${
                      isSelected ? 'text-slate-900/80' : 'text-slate-500'
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Energy Selector (Segmented Control) */}
        <div className="mb-7">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <BatteryMedium className="w-3.5 h-3.5 text-slate-400" />
            <span>Уровень энергии</span>
          </label>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
            {energyOptions.map((opt) => {
              const isSelected = energyState === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergyState(opt.value)}
                  className={`min-h-[50px] px-2 py-2 rounded-xl border text-center transition-all duration-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? `${opt.activeBg} font-bold shadow-md`
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {opt.icon}
                    <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                    {opt.sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Preferred Content Type (Optional Chips) */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Формат (опционально)
          </label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((t) => {
              const isSelected = preferredType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPreferredType(t.value)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Primary Button: "Что мне сделать?" */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onRequestRecommendation}
          className="relative group min-h-[52px] w-full px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Дворецкий подбирает лучший вариант...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Что мне сделать?</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
