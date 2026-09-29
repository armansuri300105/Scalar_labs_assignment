'use client';

import React, { useState } from 'react';
import { Search, Settings, HelpCircle, Bell, Video, User, Check, ChevronDown } from 'lucide-react';

export function DashboardNavbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-[#1E2024] border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Zoom Brand */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0E71EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Video className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0E71EB] dark:text-[#2D8CFF]">
            zoom
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0E71EB] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
            Clone
          </span>
        </div>

        {/* Search bar */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search meetings, recordings, contacts..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-800/80 rounded-full border border-transparent focus:border-[#0E71EB] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#16181D] text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Placeholder toolbar buttons */}
        <button
          title="Notifications"
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white dark:ring-[#1E2024]" />
        </button>

        <button
          title="Settings"
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          title="Support / Help"
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold shadow-xs">
                MA
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1E2024] absolute -bottom-0.5 -right-0.5" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:inline-block">
              Mohammed Arshad
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1E2024] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={() => setShowProfileMenu(false)}
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-white">Mohammed Arshad</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">arshad@scaler.labs</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Available (Default User)
                </div>
              </div>

              <div className="py-1 text-sm text-slate-600 dark:text-slate-300">
                <div className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md cursor-pointer flex items-center justify-between">
                  <span>Licensed Account</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase">Pro</span>
                </div>
                <div className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md cursor-pointer">
                  Personal Meeting ID (PMI)
                </div>
                <div className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md cursor-pointer">
                  Settings & Preferences
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
