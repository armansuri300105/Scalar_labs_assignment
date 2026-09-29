'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Calendar, Users, MessageSquare, LayoutTemplate, Disc, Phone } from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'meetings' | 'recordings';
  onSelectTab: (tab: 'home' | 'meetings' | 'recordings') => void;
}

export function DashboardSidebar({ activeTab, onSelectTab }: SidebarProps) {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'meetings' as const, label: 'Meetings', icon: Calendar },
    { id: 'team-chat', label: 'Team Chat', icon: MessageSquare, badge: '3' },
    { id: 'whiteboards', label: 'Whiteboards', icon: LayoutTemplate },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'recordings' as const, label: 'Recordings', icon: Disc },
  ];

  return (
    <aside className="w-64 bg-slate-50/70 dark:bg-[#181A1F] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 hidden md:flex transition-colors">
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'home' || item.id === 'meetings' || item.id === 'recordings') {
                    onSelectTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0E71EB] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SDE Assignment Info footer */}
      <div className="p-3.5 bg-white dark:bg-[#1E2024] rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 shadow-2xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Scaler SDE Assignment
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
          Fullstack Zoom Web App with FastAPI + Next.js + SQLite.
        </p>
      </div>
    </aside>
  );
}
