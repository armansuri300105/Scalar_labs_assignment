'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

export function ClockWidget() {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Welcome back');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      );

      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E71EB] via-[#1059CA] to-[#0A3D8F] p-7 text-white shadow-xl shadow-blue-500/15">
      {/* Decorative background glow circles */}
      <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-blue-50">
            <Clock className="w-3.5 h-3.5" />
            Live System Time
          </span>
          <div className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight font-mono">
            {time || '00:00:00 AM'}
          </div>
        </div>

        <div className="border-t border-white/15 pt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-100 font-medium">
            <CalendarIcon className="w-4 h-4 text-blue-200" />
            <span>{dateStr || 'Loading date...'}</span>
          </div>
          <div className="text-xs text-blue-200 font-medium hidden sm:block">
            {greeting}, Mohammed!
          </div>
        </div>
      </div>
    </div>
  );
}
