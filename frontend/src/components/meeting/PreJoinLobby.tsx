'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Settings, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { Meeting } from '../../types';
import { formatMeetingId } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface PreJoinLobbyProps {
  meeting: Meeting;
  onJoin: (displayName: string, isMuted: boolean, isVideoOff: boolean, passcode?: string) => void;
  isJoining: boolean;
}

export function PreJoinLobby({ meeting, onJoin, isJoining }: PreJoinLobbyProps) {
  const router = useRouter();
  const { error } = useToast();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`zoom_passcode_${meeting.id}`) || '';
    }
    return '';
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const isHostUser =
    (user && meeting.owner_id && user.id === meeting.owner_id) ||
    (typeof window !== 'undefined' &&
      (sessionStorage.getItem(`zoom_is_host_${meeting.id}`) === 'true' ||
        localStorage.getItem(`zoom_is_host_${meeting.id}`) === 'true'));

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Read initial preferences if stored or use logged-in user
    if (user?.full_name) {
      setDisplayName(user.full_name);
    } else if (typeof window !== 'undefined') {
      const savedName = sessionStorage.getItem('zoom_display_name') || localStorage.getItem('zoom_user_name');
      if (savedName) setDisplayName(savedName);
    }

    if (typeof window !== 'undefined') {
      const noAudio = sessionStorage.getItem('zoom_initial_no_audio') === 'true';
      const noVideo = sessionStorage.getItem('zoom_initial_no_video') === 'true';
      if (noAudio) setIsMuted(true);
      if (noVideo) setIsVideoOff(true);
      const savedPass = sessionStorage.getItem(`zoom_passcode_${meeting.id}`);
      if (savedPass) setPasscode(savedPass);
    }
  }, [user, meeting.id]);

  // Handle local camera preview
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initPreview() {
      if (isVideoOff) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
          });
          streamRef.current = localStream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
        } else {
          setHasCameraPermission(false);
        }
      } catch (err) {
        console.warn('Camera preview not available or permission denied:', err);
        setHasCameraPermission(false);
      }
    }

    initPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayName.trim();
    if (!clean) {
      error('Please enter a display name to join the meeting.');
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('zoom_display_name', clean);
      localStorage.setItem('zoom_user_name', clean);
    }
    // Prime and unlock audio on this user gesture for mobile browsers (iOS & Android)
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch {}

    if (meeting.passcode && !isHostUser && !passcode.trim()) {
      error('Please enter the meeting passcode.');
      return;
    }
    if (passcode.trim()) {
      sessionStorage.setItem(`zoom_passcode_${meeting.id}`, passcode.trim());
    }

    // Clean up preview stream before joining room
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onJoin(clean, isMuted, isVideoOff, passcode.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-[#111317] text-white flex flex-col justify-between p-3 sm:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xs:inline">End-to-End Encrypted</span>
          <span className="xs:hidden">Encrypted</span>
        </div>
      </div>

      {/* Main Center Area */}
      <div className="max-w-4xl mx-auto w-full my-auto py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-center">
        {/* Left: Video Preview Window */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-[#1C1F26] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            {!isVideoOff && hasCameraPermission ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-3xl font-bold shadow-lg">
                  {displayName.slice(0, 2).toUpperCase() || 'ME'}
                </div>
                <span className="text-sm font-medium text-slate-400">
                  {isVideoOff ? 'Camera is turned off' : 'Camera preview unavailable'}
                </span>
              </div>
            )}

            {/* In-preview display label */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-2 border border-white/10">
              <span>{displayName || 'You'}</span>
              {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>

            {/* Quick Toggle pill inside preview */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                  isMuted ? 'bg-rose-500/80 text-white' : 'bg-black/60 text-white hover:bg-black/80'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                  isVideoOff ? 'bg-rose-500/80 text-white' : 'bg-black/60 text-white hover:bg-black/80'
                }`}
                title={isVideoOff ? 'Turn on video' : 'Turn off video'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            Check your audio and video before entering the meeting room.
          </p>
        </div>

        {/* Right: Meeting info & Join Form */}
        <div className="lg:col-span-5 bg-[#1C1F26] p-7 rounded-2xl border border-white/10 shadow-xl space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Ready to join?
            </span>
            <h1 className="text-xl font-bold text-white mt-1 leading-tight">
              {meeting.title}
            </h1>
            <div className="mt-2 text-xs text-slate-400 space-y-1">
              <div>Host: <span className="text-slate-200 font-medium">{meeting.host_name}</span></div>
              <div>Meeting ID: <span className="font-mono text-slate-200">{formatMeetingId(meeting.id)}</span></div>
              {meeting.passcode && isHostUser && (
                <div>Passcode: <span className="font-mono text-slate-200">{meeting.passcode}</span></div>
              )}
              {meeting.passcode && !isHostUser && (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Passcode Required</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name (e.g. Alex, Guest, Your Name)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111317] border border-slate-700 text-white text-sm focus:outline-none focus:border-[#0E71EB] focus:ring-1 focus:ring-[#0E71EB]"
              />
            </div>

            {meeting.passcode && !isHostUser && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Meeting Passcode</span>
                  <span className="text-[11px] text-amber-400 font-normal">Required</span>
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter meeting passcode"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111317] border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-[#0E71EB] focus:ring-1 focus:ring-[#0E71EB]"
                />
              </div>
            )}

            <div className="space-y-2 pt-1 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMuted}
                  onChange={(e) => setIsMuted(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-[#0E71EB] focus:ring-0"
                />
                <span>Join with microphone muted</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVideoOff}
                  onChange={(e) => setIsVideoOff(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-[#0E71EB] focus:ring-0"
                />
                <span>Join with camera turned off</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3 bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-70 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entering room...</span>
                </>
              ) : (
                <span>Join Meeting</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        Zoom Clone Web Application • Built with Next.js, FastAPI & SQLite
      </div>
    </div>
  );
}
