'use client';

import React, { useState } from 'react';
import { Video, Plus, Calendar, ArrowUpFromLine, ChevronDown, Check } from 'lucide-react';

interface QuickActionsProps {
  onStartInstantMeeting: () => void;
  onOpenJoinModal: () => void;
  onOpenScheduleModal: () => void;
  onShareScreen: () => void;
  isStartingInstant?: boolean;
}

export function QuickActions({
  onStartInstantMeeting,
  onOpenJoinModal,
  onOpenScheduleModal,
  onShareScreen,
  isStartingInstant = false
}: QuickActionsProps) {
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);
  const [startWithVideo, setStartWithVideo] = useState(true);
  const [usePMI, setUsePMI] = useState(false);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. NEW MEETING BUTTON (Zoom Iconic Orange) */}
      <div className="flex flex-col items-center">
        <div className="relative group w-full flex items-center justify-center">
          <button
            onClick={onStartInstantMeeting}
            disabled={isStartingInstant}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#F26D21] hover:bg-[#E05A10] active:scale-95 text-white flex flex-col items-center justify-center shadow-lg shadow-orange-500/25 transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isStartingInstant ? (
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Video className="w-9 h-9 sm:w-11 sm:h-11 fill-current" />
            )}
          </button>

          {/* Instant meeting options dropdown trigger */}
          <button
            onClick={() => setShowNewMeetingMenu(!showNewMeetingMenu)}
            className="absolute -bottom-2 -right-1 sm:right-2 p-1.5 rounded-full bg-white dark:bg-[#2A2E35] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-md transition-colors"
            title="New Meeting Settings"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown popup */}
          {showNewMeetingMenu && (
            <div
              className="absolute top-full mt-3 left-0 sm:left-auto w-64 bg-white dark:bg-[#1E2024] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                Instant Options
              </div>
              <div
                onClick={() => setStartWithVideo(!startWithVideo)}
                className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
              >
                <span>Start with video</span>
                {startWithVideo && <Check className="w-4 h-4 text-[#0E71EB]" />}
              </div>
              <div
                onClick={() => setUsePMI(!usePMI)}
                className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
              >
                <span>Use Personal Meeting ID</span>
                {usePMI && <Check className="w-4 h-4 text-[#0E71EB]" />}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                <button
                  onClick={() => {
                    setShowNewMeetingMenu(false);
                    onStartInstantMeeting();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#0E71EB] hover:underline font-semibold"
                >
                  Start Instant Meeting Now →
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
          New Meeting
        </span>
      </div>

      {/* 2. JOIN BUTTON (Zoom Signature Blue) */}
      <div className="flex flex-col items-center">
        <button
          onClick={onOpenJoinModal}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0E71EB] hover:bg-[#0B5ED7] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5]" />
        </button>
        <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Join
        </span>
      </div>

      {/* 3. SCHEDULE BUTTON (Zoom Signature Blue) */}
      <div className="flex flex-col items-center">
        <button
          onClick={onOpenScheduleModal}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0E71EB] hover:bg-[#0B5ED7] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer"
        >
          <Calendar className="w-9 h-9 sm:w-11 sm:h-11" />
        </button>
        <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Schedule
        </span>
      </div>

      {/* 4. SHARE SCREEN BUTTON (Zoom Signature Blue) */}
      <div className="flex flex-col items-center">
        <button
          onClick={onShareScreen}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0E71EB] hover:bg-[#0B5ED7] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer"
        >
          <ArrowUpFromLine className="w-9 h-9 sm:w-11 sm:h-11" />
        </button>
        <span className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Share Screen
        </span>
      </div>
    </div>
  );
}
