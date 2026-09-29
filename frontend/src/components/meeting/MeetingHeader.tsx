'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Info, Maximize2, Minimize2, Grid, User, Copy, Check, Lock } from 'lucide-react';
import { Meeting } from '../../types';
import { formatMeetingId, getFullInviteUrl, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface MeetingHeaderProps {
  meeting: Meeting;
  viewMode: 'gallery' | 'speaker';
  onToggleViewMode: () => void;
}

export function MeetingHeader({ meeting, viewMode, onToggleViewMode }: MeetingHeaderProps) {
  const { success, error } = useToast();
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const copyField = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) success(`${label} copied to clipboard!`);
    else error(`Failed to copy ${label}`);
  };

  const inviteUrl = getFullInviteUrl(meeting.invite_token, true);

  return (
    <div className="h-14 bg-[#1A1D24] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between text-white select-none z-30 shrink-0">
      {/* Left: Meeting Info Button & Title */}
      <div className="flex items-center gap-3 relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          title="Meeting Information"
          className="flex items-center gap-1.5 p-1.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Info</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-100 truncate max-w-xs sm:max-w-md">
            {meeting.title}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {formatTimer(secondsElapsed)}
          </span>
        </div>

        {/* Meeting Info Popup (Zoom classic top-left modal) */}
        {showInfo && (
          <div
            className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-[#24272C] rounded-2xl shadow-2xl border border-white/15 p-5 z-50 text-xs space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Meeting Information</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                Encrypted
              </span>
            </div>

            <div className="space-y-3 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[11px]">Topic</span>
                <span className="font-semibold text-white text-sm">{meeting.title}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Meeting ID</span>
                  <span className="font-mono text-white text-sm font-semibold">
                    {formatMeetingId(meeting.id)}
                  </span>
                </div>
                <button
                  onClick={() => copyField(meeting.id, 'Meeting ID')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                  title="Copy ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {meeting.passcode && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Passcode</span>
                    <span className="font-mono text-white text-sm font-semibold">
                      {meeting.passcode}
                    </span>
                  </div>
                  <button
                    onClick={() => copyField(meeting.passcode!, 'Passcode')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                    title="Copy Passcode"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <span className="text-slate-400 block text-[11px]">Host</span>
                <span className="text-white font-medium">{meeting.host_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Invite Link</span>
                <div className="mt-1 flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                  <span className="font-mono text-[11px] text-blue-400 truncate flex-1">
                    {inviteUrl}
                  </span>
                  <button
                    onClick={() => copyField(inviteUrl, 'Invite Link')}
                    className="px-2 py-1 bg-[#0E71EB] hover:bg-blue-600 text-white rounded text-[11px] font-semibold shrink-0 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: View & Fullscreen */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
        >
          {viewMode === 'gallery' ? (
            <>
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Speaker View</span>
            </>
          ) : (
            <>
              <Grid className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Gallery View</span>
            </>
          )}
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
