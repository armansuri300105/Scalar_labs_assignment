'use client';

import React, { useState } from 'react';
import { Shield, Lock, Users, Check, X } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

export function SecurityModal({ isOpen, onClose, isLocked, onToggleLock }: SecurityModalProps) {
  const [allowShare, setAllowShare] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowRename, setAllowRename] = useState(true);
  const [allowUnmute, setAllowUnmute] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-sm bg-[#24272C] rounded-2xl shadow-2xl border border-white/15 p-5 text-white space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Security Options</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock meeting */}
        <div
          onClick={onToggleLock}
          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-300" />
            <span className="font-medium">Lock Meeting</span>
          </div>
          {isLocked && <Check className="w-4 h-4 text-[#0E71EB]" />}
        </div>

        {/* Permissions */}
        <div className="border-t border-white/10 pt-3 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2.5">
            Allow participants to:
          </span>

          <div
            onClick={() => setAllowShare(!allowShare)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer text-xs"
          >
            <span>Share Screen</span>
            {allowShare && <Check className="w-4 h-4 text-[#0E71EB]" />}
          </div>

          <div
            onClick={() => setAllowChat(!allowChat)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer text-xs"
          >
            <span>Chat</span>
            {allowChat && <Check className="w-4 h-4 text-[#0E71EB]" />}
          </div>

          <div
            onClick={() => setAllowRename(!allowRename)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer text-xs"
          >
            <span>Rename Themselves</span>
            {allowRename && <Check className="w-4 h-4 text-[#0E71EB]" />}
          </div>

          <div
            onClick={() => setAllowUnmute(!allowUnmute)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer text-xs"
          >
            <span>Unmute Themselves</span>
            {allowUnmute && <Check className="w-4 h-4 text-[#0E71EB]" />}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0E71EB] hover:bg-blue-600 rounded-xl text-xs font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
