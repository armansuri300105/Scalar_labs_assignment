'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VideoTile, TileParticipant } from './VideoTile';
import { Monitor, ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoGridProps {
  participants: TileParticipant[];
  viewMode: 'gallery' | 'speaker';
  screenShareStream?: MediaStream | null;
  screenShareBy?: string | null;
  pinnedParticipantId?: string | null;
  onTogglePin?: (id: string) => void;
}

export function VideoGrid({
  participants,
  viewMode,
  screenShareStream,
  screenShareBy,
  pinnedParticipantId,
  onTogglePin
}: VideoGridProps) {
  const [internalPinnedId, setInternalPinnedId] = useState<string | null>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Controlled or uncontrolled pinned ID
  const effectivePinnedId =
    pinnedParticipantId !== undefined ? pinnedParticipantId : internalPinnedId;

  const togglePin = (id: string) => {
    if (onTogglePin) {
      onTogglePin(id);
    } else {
      setInternalPinnedId((prev) => (prev === id ? null : id));
    }
  };

  // Reset pin if pinned participant left
  useEffect(() => {
    if (effectivePinnedId && !participants.some((p) => p.id === effectivePinnedId)) {
      if (onTogglePin) {
        onTogglePin(effectivePinnedId);
      } else {
        setInternalPinnedId(null);
      }
    }
  }, [participants, effectivePinnedId, onTogglePin]);

  // Check scroll capability of horizontal filmstrip
  const checkFilmstripScroll = () => {
    if (filmstripRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filmstripRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkFilmstripScroll();
    const el = filmstripRef.current;
    if (el) {
      el.addEventListener('scroll', checkFilmstripScroll);
      window.addEventListener('resize', checkFilmstripScroll);
      return () => {
        el.removeEventListener('scroll', checkFilmstripScroll);
        window.removeEventListener('resize', checkFilmstripScroll);
      };
    }
  }, [participants.length, effectivePinnedId, screenShareStream]);

  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      filmstripRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Find pinned participant or active speaker
  const pinnedParticipant = participants.find((p) => p.id === effectivePinnedId);
  const activeSpeaker =
    participants.find((p) => p.isSpeaking) ||
    participants.find((p) => !p.isSelf) ||
    participants[0];

  const isScreenShareActive = !!screenShareStream;
  // A focus view is required when screen sharing, when a participant is pinned, or in speaker view
  const isFocusView = isScreenShareActive || !!pinnedParticipant || (viewMode === 'speaker' && participants.length > 0);

  // 1. FOCUS VIEW: Screen Share OR Pinned Participant OR Speaker View
  if (isFocusView) {
    let mainParticipant: TileParticipant | null = null;
    let filmstripList: TileParticipant[] = [];

    if (isScreenShareActive) {
      // Screen share is the main viewport; all participants are in the filmstrip
      filmstripList = participants;
    } else if (pinnedParticipant) {
      // Pinned participant is the main viewport; others are in the filmstrip
      mainParticipant = pinnedParticipant;
      filmstripList = participants.filter((p) => p.id !== pinnedParticipant.id);
    } else {
      // Speaker mode without pin: active speaker is main; others are in filmstrip
      mainParticipant = activeSpeaker;
      filmstripList = participants.filter((p) => p.id !== activeSpeaker?.id);
    }

    return (
      <div className="flex-1 p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-h-0 overflow-hidden relative">
        {/* Horizontal Filmstrip (Zoom-style) */}
        {filmstripList.length > 0 && (
          <div className="relative w-full shrink-0 group/strip">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollFilmstrip('left')}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-lg border border-white/20 transition-all cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollFilmstrip('right')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-lg border border-white/20 transition-all cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Filmstrip Scroll Container */}
            <div
              ref={filmstripRef}
              className="w-full h-22 sm:h-28 md:h-32 flex items-center gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden px-1 pb-1.5 scroll-smooth"
            >
              {filmstripList.map((p) => (
                <div key={p.id} className="h-full aspect-video shrink-0">
                  <VideoTile
                    participant={p}
                    isPinned={effectivePinnedId === p.id}
                    onPin={() => togglePin(p.id)}
                    aspectRatioClass="h-full w-auto aspect-video"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Large Viewport */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
          {isScreenShareActive ? (
            <div className="w-full h-full bg-black rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center shadow-2xl">
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
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2 border border-white/15 shadow-lg">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>{screenShareBy ? `${screenShareBy}'s Screen` : 'Shared Screen'}</span>
              </div>
            </div>
          ) : mainParticipant ? (
            <div className="w-full h-full max-w-6xl flex items-center justify-center">
              <VideoTile
                participant={mainParticipant}
                isPinned={effectivePinnedId === mainParticipant.id}
                onPin={() => togglePin(mainParticipant.id)}
                aspectRatioClass="w-full h-full max-h-full aspect-video object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 2. GALLERY VIEW (No screen share, no one pinned)
  const count = participants.length;

  if (count <= 1) {
    return (
      <div className="flex-1 p-2 sm:p-6 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="w-full max-w-4xl aspect-video flex items-center justify-center">
          {participants[0] && (
            <VideoTile
              participant={participants[0]}
              isPinned={false}
              onPin={() => togglePin(participants[0].id)}
              aspectRatioClass="w-full h-full aspect-video"
            />
          )}
        </div>
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="flex-1 p-2 sm:p-6 flex items-center justify-center min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-5xl my-auto">
          {participants.map((p) => (
            <VideoTile
              key={p.id}
              participant={p}
              isPinned={false}
              onPin={() => togglePin(p.id)}
              aspectRatioClass="aspect-video"
            />
          ))}
        </div>
      </div>
    );
  }

  if (count <= 4) {
    return (
      <div className="flex-1 p-2 sm:p-6 flex items-center justify-center min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-5xl my-auto">
          {participants.map((p) => (
            <VideoTile
              key={p.id}
              participant={p}
              isPinned={false}
              onPin={() => togglePin(p.id)}
              aspectRatioClass="aspect-video"
            />
          ))}
        </div>
      </div>
    );
  }

  // Count > 4 participants in Gallery view
  return (
    <div className="flex-1 p-2 sm:p-6 flex items-start sm:items-center justify-center min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-6xl my-auto">
        {participants.map((p) => (
          <VideoTile
            key={p.id}
            participant={p}
            isPinned={false}
            onPin={() => togglePin(p.id)}
            aspectRatioClass="aspect-video min-w-[240px]"
          />
        ))}
      </div>
    </div>
  );
}
