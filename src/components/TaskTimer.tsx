'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Bell } from 'lucide-react';

interface TaskTimerProps {
  initialMinutes: number;
  taskTitle: string;
  onComplete?: () => void;
}

export function TaskTimer({ initialMinutes, taskTitle, onComplete }: TaskTimerProps) {
  const totalSeconds = Math.max(60, initialMinutes * 60);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(Math.max(60, initialMinutes * 60));
    setIsRunning(false);
    setIsFinished(false);
  }, [initialMinutes, taskTitle]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      setIsRunning(false);
      setIsFinished(true);
      // Play soft notification beep if audio context is supported
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      } catch {
        // audio context fallback
      }
      onComplete?.();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, timeLeft, isFinished, onComplete]);

  const toggleRun = () => {
    if (isFinished) {
      setTimeLeft(totalSeconds);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalSeconds);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100));

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        <Bell className="w-3.5 h-3.5 text-amber-400" />
        <span>Таймер концентрации</span>
      </div>

      {/* Circular / Progress Display */}
      <div className="relative w-36 h-36 flex items-center justify-center my-2">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            className="text-slate-800 stroke-current"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            className={`stroke-current transition-all duration-500 ease-linear ${
              isFinished ? 'text-emerald-400' : 'text-amber-500'
            }`}
            strokeWidth="8"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * progressPercent) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold tracking-tight text-white">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
            {isFinished ? 'Завершено!' : isRunning ? 'Фокус' : 'Пауза'}
          </span>
        </div>
      </div>

      {isFinished && (
        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium my-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Время вышло! Отличная работа!</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={toggleRun}
          className={`min-h-[44px] px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all active:scale-95 ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
          }`}
          aria-label={isRunning ? 'Пауза' : 'Старт'}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Пауза</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{timeLeft < totalSeconds ? 'Продолжить' : 'Начать'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center active:scale-95"
          title="Сбросить таймер"
          aria-label="Сбросить таймер"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
