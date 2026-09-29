'use client';

import React, { useState } from 'react';
import { VideoTile, TileParticipant } from './VideoTile';
import { Monitor } from 'lucide-react';

interface VideoGridProps {
  participants: TileParticipant[];
  viewMode: 'gallery' | 'speaker';
  screenShareStream?: MediaStream | null;
  screenShareBy?: string | null;
}

export function VideoGrid({
  participants,
  viewMode,
  screenShareStream,
  screenShareBy
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const togglePin = (id: string) => {
    setPinnedId((prev) => (prev === id ? null : id));
  };

  // Determine active speaker (pinned participant, or first non-self speaking, or self)
  const activeSpeaker =
    participants.find((p) => p.id === pinnedId) ||
    participants.find((p) => p.isSpeaking) ||
    participants[0];

  // Screen share active?
  if (screenShareStream) {
    return (
      <div className="flex-1 p-3 sm:p-4 flex flex-col gap-3 min-h-0 overflow-hidden">
        {/* Top participant filmstrip */}
        <div className="h-28 sm:h-32 flex items-center gap-3 overflow-x-auto pb-1 shrink-0">
          {participants.map((p) => (
            <div key={p.id} className="h-full aspect-video shrink-0">
              <VideoTile participant={p} aspectRatioClass="h-full aspect-video" />
            </div>
          ))}
        </div>

        {/* Large screen share viewport */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center min-h-0">
          <video
            ref={(node) => {
              if (node && screenShareStream) {
                node.srcObject = screenShareStream;
              }
            }}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5 border border-white/10">
            <Monitor className="w-3.5 h-3.5" />
            <span>{screenShareBy || 'Participant'}'s Screen</span>
          </div>
        </div>
      </div>
    );
  }

  // Speaker View Mode
  if (viewMode === 'speaker' && activeSpeaker) {
    const others = participants.filter((p) => p.id !== activeSpeaker.id);
    return (
      <div className="flex-1 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Main Speaker Stage */}
        <div className="flex-1 h-full min-h-0 flex items-center justify-center">
          <VideoTile
            participant={activeSpeaker}
            isPinned={pinnedId === activeSpeaker.id}
            onPin={() => togglePin(activeSpeaker.id)}
            aspectRatioClass="w-full h-full max-h-full aspect-auto"
          />
        </div>

        {/* Side thumbnail strip */}
        {others.length > 0 && (
          <div className="sm:w-56 flex sm:flex-col gap-3 overflow-auto shrink-0">
            {others.map((p) => (
              <div key={p.id} className="w-40 sm:w-full aspect-video shrink-0">
                <VideoTile
                  participant={p}
                  isPinned={pinnedId === p.id}
                  onPin={() => togglePin(p.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gallery View Mode
  const count = participants.length;
  let gridColsClass = 'grid-cols-1';
  if (count === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  else if (count >= 3 && count <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  else if (count >= 5) gridColsClass = 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className="flex-1 p-3 sm:p-6 overflow-y-auto flex items-center justify-center min-h-0">
      <div className={`grid ${gridColsClass} gap-3 sm:gap-4 w-full max-w-6xl max-h-full items-center justify-center`}>
        {participants.map((p) => (
          <VideoTile
            key={p.id}
            participant={p}
            isPinned={pinnedId === p.id}
            onPin={() => togglePin(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
