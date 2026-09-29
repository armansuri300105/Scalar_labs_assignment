'use client';

import React, { useState } from 'react';
import { X, Search, Mic, MicOff, Video, VideoOff, MoreVertical, UserMinus, ShieldAlert, VolumeX, UserPlus } from 'lucide-react';
import { TileParticipant } from './VideoTile';

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  participants: TileParticipant[];
  isHost: boolean;
  onMuteAll: () => void;
  onRemoveParticipant: (participantId: string) => void;
  onToggleParticipantMute: (participantId: string) => void;
  onOpenInvite: () => void;
}

export function ParticipantsPanel({
  isOpen,
  onClose,
  participants,
  isHost,
  onMuteAll,
  onRemoveParticipant,
  onToggleParticipantMute,
  onOpenInvite
}: ParticipantsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = participants.filter((p) =>
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 sm:w-88 bg-[#1E2024] border-l border-white/10 flex flex-col h-full z-20 shrink-0 text-white select-none">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Participants ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Find a participant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0E71EB]"
          />
        </div>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="py-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between group relative"
          >
            {/* Avatar & Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                {p.displayName.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate max-w-[130px]">
                    {p.displayName}
                  </span>
                  {p.isSelf && <span className="text-[10px] text-slate-400">(Me)</span>}
                </div>
                <div className="flex items-center gap-1">
                  {p.role === 'host' && (
                    <span className="text-[10px] text-blue-400 font-semibold">Host</span>
                  )}
                  {p.isHandRaised && (
                    <span className="text-[10px] text-amber-400 font-medium">✋ Raised hand</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Icons & Controls */}
            <div className="flex items-center gap-2">
              {p.isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              )}

              {p.isVideoOff ? (
                <VideoOff className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Video className="w-3.5 h-3.5 text-slate-300" />
              )}

              {/* Host actions menu */}
              {isHost && !p.isSelf && (
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {activeMenuId === p.id && (
                    <div
                      className="absolute right-0 mt-1 w-40 bg-[#24272C] rounded-xl shadow-xl border border-white/15 p-1 z-50 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onToggleParticipantMute(p.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-slate-200 cursor-pointer flex items-center gap-2"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.isMuted ? 'Ask to Unmute' : 'Mute'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onRemoveParticipant(p.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer flex items-center gap-2"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Host Controls & Invite Footer */}
      <div className="p-3 border-t border-white/10 bg-[#181A20] space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInvite}
            className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          {isHost && (
            <button
              onClick={onMuteAll}
              className="py-2 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
