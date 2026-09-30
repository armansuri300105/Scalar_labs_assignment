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
    <>
      <style>{`
        @keyframes floatUpAnimation {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          15% {
            transform: translateY(-40px) scale(1.25);
            opacity: 1;
          }
          30% {
            transform: translateY(-100px) scale(1);
            opacity: 1;
          }
          75% {
            transform: translateY(-300px) scale(0.95);
            opacity: 0.9;
          }
          100% {
            transform: translateY(-460px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 sm:bottom-28 flex flex-col items-center select-none pointer-events-none"
            style={{
              left: `${r.leftPercent}%`,
              animation: 'floatUpAnimation 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            }}
          >
            <span className="text-5xl sm:text-6xl filter drop-shadow-2xl">{r.emoji}</span>
            <span className="text-xs text-white bg-black/80 backdrop-blur-md px-3 py-1 rounded-full font-semibold mt-1.5 border border-white/20 shadow-lg whitespace-nowrap">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
