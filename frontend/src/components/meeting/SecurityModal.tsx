'use client';

import React from 'react';
import { Shield, Lock, Unlock, MessageSquare, MonitorUp, UserCheck, Mic, Check, X, Loader2 } from 'lucide-react';
import { SecuritySettings } from '../../types';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  settings: SecuritySettings;
  onToggleSetting: (key: keyof SecuritySettings) => void;
  isUpdatingKey?: string | null;
}

export function SecurityModal({
  isOpen,
  onClose,
  isHost,
  settings,
  onToggleSetting,
  isUpdatingKey
}: SecurityModalProps) {
  if (!isOpen || !isHost) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#24272C] rounded-2xl shadow-2xl border border-white/15 p-5 text-white space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Security Options (Host Only)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock meeting */}
        <div
          onClick={() => onToggleSetting('is_locked')}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer text-xs transition-colors border border-white/5"
        >
          <div className="flex items-center gap-2.5">
            {settings.is_locked ? (
              <Lock className="w-4 h-4 text-amber-400" />
            ) : (
              <Unlock className="w-4 h-4 text-slate-400" />
            )}
            <div>
              <div className="font-semibold text-slate-200">Lock Meeting</div>
              <div className="text-[10px] text-slate-400">
                {settings.is_locked
                  ? 'No new participants can join'
                  : 'New participants can join with link or code'}
              </div>
            </div>
          </div>
          {isUpdatingKey === 'is_locked' ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0E71EB]" />
          ) : (
            settings.is_locked && <Check className="w-4 h-4 text-[#0E71EB] stroke-[3]" />
          )}
        </div>

        {/* Permissions */}
        <div className="border-t border-white/10 pt-3 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2.5 mb-1">
            Allow participants to:
          </span>

          {/* Share Screen */}
          <div
            onClick={() => onToggleSetting('allow_share_screen')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MonitorUp className="w-4 h-4 text-slate-400" />
              <span>Share Screen</span>
            </div>
            {isUpdatingKey === 'allow_share_screen' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0E71EB]" />
            ) : (
              settings.allow_share_screen && <Check className="w-4 h-4 text-[#0E71EB] stroke-[3]" />
            )}
          </div>

          {/* Chat */}
          <div
            onClick={() => onToggleSetting('allow_chat')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Chat</span>
            </div>
            {isUpdatingKey === 'allow_chat' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0E71EB]" />
            ) : (
              settings.allow_chat && <Check className="w-4 h-4 text-[#0E71EB] stroke-[3]" />
            )}
          </div>

          {/* Rename Themselves */}
          <div
            onClick={() => onToggleSetting('allow_rename')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>Rename Themselves</span>
            </div>
            {isUpdatingKey === 'allow_rename' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0E71EB]" />
            ) : (
              settings.allow_rename && <Check className="w-4 h-4 text-[#0E71EB] stroke-[3]" />
            )}
          </div>

          {/* Unmute Themselves */}
          <div
            onClick={() => onToggleSetting('allow_unmute')}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-slate-400" />
              <span>Unmute Themselves</span>
            </div>
            {isUpdatingKey === 'allow_unmute' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0E71EB]" />
            ) : (
              settings.allow_unmute && <Check className="w-4 h-4 text-[#0E71EB] stroke-[3]" />
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0E71EB] hover:bg-blue-600 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
