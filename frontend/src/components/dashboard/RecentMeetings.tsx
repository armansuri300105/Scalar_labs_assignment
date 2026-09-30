'use client';

import React from 'react';
import { History, Copy, Clock, CheckCircle2, User, RefreshCw, Trash2 } from 'lucide-react';
import { Meeting } from '../../types';
import { formatDateTime, formatMeetingId, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface RecentMeetingsProps {
  meetings: Meeting[];
  isLoading: boolean;
  onJoinMeeting: (meetingId: string) => void;
  onDeleteMeeting?: (meeting: Meeting) => void;
}

export function RecentMeetings({ meetings, isLoading, onJoinMeeting, onDeleteMeeting }: RecentMeetingsProps) {
  const { success, error } = useToast();

  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const copied = await copyToClipboard(id);
    if (copied) success(`Meeting ID ${formatMeetingId(id)} copied!`);
    else error('Failed to copy ID.');
  };

  return (
    <div className="bg-white dark:bg-[#1E2024] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Recent Meetings
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {meetings.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              History of past calls and meetings you participated in
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
        {isLoading ? (
          <div className="py-6 space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="animate-pulse h-14 bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent meeting history recorded yet.
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="py-3.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {meeting.title}
                  </h4>
                  {meeting.status === 'ended' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Ended
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDateTime(meeting.scheduled_at || meeting.created_at)}
                  </span>
                  <span>•</span>
                  <span>Host: {meeting.host_name}</span>
                  <span>•</span>
                  <span>ID: <code className="font-mono">{formatMeetingId(meeting.id)}</code></span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleCopyId(meeting.id, e)}
                  title="Copy Meeting ID"
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {onDeleteMeeting && (
                  <button
                    onClick={() => onDeleteMeeting(meeting)}
                    title="Delete Meeting History"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => onJoinMeeting(meeting.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#0E71EB] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-open</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
