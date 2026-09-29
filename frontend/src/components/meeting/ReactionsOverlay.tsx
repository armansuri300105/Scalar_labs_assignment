'use client';

import React from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

interface ReactionsOverlayProps {
  reactions: FloatingReaction[];
}

export function ReactionsOverlay({ reactions }: ReactionsOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-20 flex flex-col items-center animate-reaction-float"
          style={{ left: `${r.leftPercent}%` }}
        >
          <span className="text-4xl filter drop-shadow-lg">{r.emoji}</span>
          <span className="text-[10px] text-white/90 bg-black/50 px-2 py-0.5 rounded-full font-medium mt-1">
            {r.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}
