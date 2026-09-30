'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Hand, Pin, ShieldCheck } from 'lucide-react';

export interface TileParticipant {
  id: string;
  displayName: string;
  role: 'host' | 'participant';
  isSelf: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  stream?: MediaStream | null;
  avatarColor?: string;
}

interface VideoTileProps {
  participant: TileParticipant;
  isPinned?: boolean;
  onPin?: () => void;
  aspectRatioClass?: string;
}

export function VideoTile({
  participant,
  isPinned = false,
  onPin,
  aspectRatioClass = 'aspect-video'
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

  // Sync video stream
  useEffect(() => {
    if (videoRef.current && participant.stream && !participant.isVideoOff) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, participant.isVideoOff]);

  // Sync and play remote audio stream
  useEffect(() => {
    if (participant.isSelf || !participant.stream) return;

    const playAudio = () => {
      if (audioRef.current && participant.stream) {
        audioRef.current.srcObject = participant.stream;
        audioRef.current.play().catch((err) => {
          console.warn(`Autoplay audio notice for ${participant.displayName}:`, err);
        });
      }
    };

    playAudio();
    participant.stream.addEventListener('addtrack', playAudio);

    return () => {
      if (participant.stream) {
        participant.stream.removeEventListener('addtrack', playAudio);
      }
    };
  }, [participant.stream, participant.isSelf, participant.displayName]);

  // Real-time audio volume detection for remote participants
  useEffect(() => {
    if (participant.isSelf || !participant.stream || participant.isMuted) {
      setIsRemoteSpeaking(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(participant.stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setIsRemoteSpeaking(avg > 18);
        animId = requestAnimationFrame(checkVolume);
      };

      animId = requestAnimationFrame(checkVolume);
    } catch {
      // AudioContext error or unavailable
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [participant.stream, participant.isMuted, participant.isSelf]);

  // Color generator for avatar background
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const bgGradients = [
    'from-blue-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-amber-600 to-orange-600',
    'from-purple-600 to-pink-600',
    'from-cyan-600 to-blue-700'
  ];

  const colorIndex = Math.abs(
    participant.displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % bgGradients.length;
  const gradient = participant.avatarColor || bgGradients[colorIndex];

  const activeSpeaking = participant.isSelf ? participant.isSpeaking : (participant.isSpeaking || isRemoteSpeaking);

  return (
    <div
      className={`relative w-full ${aspectRatioClass} bg-[#181A20] rounded-2xl overflow-hidden border-2 transition-all duration-200 group flex items-center justify-center select-none ${
        activeSpeaking
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
          : 'border-white/5 hover:border-white/20'
      }`}
    >
      {/* Dedicated audio element for remote participants (plays even when video is off) */}
      {!participant.isSelf && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
        />
      )}

      {/* 1. Video Element (if video is on) */}
      {!participant.isVideoOff && participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true} // Dedicated <audio> handles remote audio; mute video to ensure autoplay never gets blocked
          className={`w-full h-full object-cover ${participant.isSelf ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        /* 2. Avatar Placeholder (if video is off) */
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl border-2 border-white/10`}
          >
            {getInitials(participant.displayName)}
          </div>
          <span className="text-xs font-medium text-slate-400">
            {participant.displayName}
          </span>
        </div>
      )}

      {/* Top Left: Hand Raised Badge */}
      {participant.isHandRaised && (
        <div className="absolute top-3 left-3 bg-amber-500/90 text-white px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-current" />
          <span>Raised Hand</span>
        </div>
      )}

      {/* Top Right: Pin Option */}
      {onPin && (
        <button
          onClick={onPin}
          title={isPinned ? 'Unpin' : 'Pin participant'}
          className={`absolute top-3 right-3 p-1.5 rounded-lg backdrop-blur-md transition-opacity ${
            isPinned
              ? 'bg-blue-600 text-white opacity-100'
              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Name & Mic status tag (Zoom classic) */}
      <div className="absolute bottom-3 left-3 max-w-[85%] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-2 border border-white/10">
        {/* Speaking / Mic icon */}
        {participant.isMuted ? (
          <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <div className="flex items-center gap-1">
            <Mic className={`w-3.5 h-3.5 ${activeSpeaking ? 'text-emerald-400' : 'text-slate-300'}`} />
            {activeSpeaking && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            )}
          </div>
        )}

        {/* Name */}
        <span className="truncate">
          {participant.displayName}
          {participant.isSelf && ' (You)'}
        </span>

        {/* Host badge */}
        {participant.role === 'host' && (
          <span className="text-[10px] bg-blue-500/80 text-white font-bold px-1.5 py-0.2 rounded shrink-0">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
