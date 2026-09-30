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
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-28 sm:bottom-24 flex flex-col items-center select-none"
          style={{
            left: `${r.leftPercent}%`,
            animation: 'reactionFloat 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
          }}
        >
          <span className="text-5xl sm:text-6xl filter drop-shadow-2xl">{r.emoji}</span>
          <span className="text-xs text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-full font-semibold mt-1.5 border border-white/20 shadow-lg whitespace-nowrap">
            {r.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}
