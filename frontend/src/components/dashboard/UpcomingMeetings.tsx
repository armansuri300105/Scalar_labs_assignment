'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, Copy, Play, Share2, Shield, MoreVertical } from 'lucide-react';
import { Meeting } from '../../types';
import { formatDateTime, formatMeetingId, copyToClipboard, buildZoomInviteText } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface UpcomingMeetingsProps {
  meetings: Meeting[];
  isLoading: boolean;
  onOpenScheduleModal: () => void;
  onOpenInviteModal: (meeting: Meeting) => void;
  onJoinMeeting: (meetingId: string) => void;
}

export function UpcomingMeetings({
  meetings,
  isLoading,
  onOpenScheduleModal,
  onOpenInviteModal,
  onJoinMeeting
}: UpcomingMeetingsProps) {
  const { success, error } = useToast();

  const handleCopyInvite = async (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = buildZoomInviteText(meeting);
    const copied = await copyToClipboard(text);
    if (copied) {
      success('Meeting invitation copied to clipboard!');
    } else {
      error('Failed to copy invitation.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E2024] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0E71EB] dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Upcoming Meetings
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {meetings.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Meetings scheduled or active today and this week
            </p>
          </div>
        </div>

        <button
          onClick={onOpenScheduleModal}
          className="text-xs font-semibold text-[#0E71EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          + Schedule New
        </button>
      </div>

      {/* List */}
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
        {isLoading ? (
          <div className="py-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20" />
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No upcoming meetings
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any upcoming meetings scheduled. Click Schedule to set up a new meeting.
            </p>
            <button
              onClick={onOpenScheduleModal}
              className="mt-4 px-4 py-2 bg-[#0E71EB] hover:bg-[#0B5ED7] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Schedule a Meeting
            </button>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="py-4.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              {/* Meeting Info */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {meeting.title}
                  </h3>
                  {meeting.status === 'active' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      In Progress
                    </span>
                  )}
                  {meeting.meeting_type === 'instant' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      Instant
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    {formatDateTime(meeting.scheduled_at)}
                  </span>
                  <span>•</span>
                  <span>{meeting.duration_minutes} mins</span>
                  <span>•</span>
                  <span>ID: <code className="font-mono text-slate-800 dark:text-slate-200">{formatMeetingId(meeting.id)}</code></span>
                  {meeting.passcode && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        Passcode: <code className="font-mono">{meeting.passcode}</code>
                      </span>
                    </>
                  )}
                </div>

                {meeting.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 italic">
                    {meeting.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleCopyInvite(meeting, e)}
                  title="Copy full Zoom invitation"
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Copy Invite</span>
                </button>

                <button
                  onClick={() => onOpenInviteModal(meeting)}
                  title="View Invitation Details"
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onJoinMeeting(meeting.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0E71EB] hover:bg-[#0B5ED7] active:scale-95 text-white shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
