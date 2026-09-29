'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function JoinPage() {
  const router = useRouter();
  const { error } = useToast();

  const [query, setQuery] = useState('');
  const [displayName, setDisplayName] = useState('Mohammed Arshad');
  const [passcode, setPasscode] = useState('');
  const [noAudio, setNoAudio] = useState(false);
  const [noVideo, setNoVideo] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanQuery = query.trim();
    const cleanName = displayName.trim();

    if (!cleanQuery) {
      setErrorMessage('Please enter a Meeting ID or Invitation Link.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please enter your Display Name.');
      return;
    }

    setIsLoading(true);
    try {
      const meeting = await api.resolveMeeting(cleanQuery);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zoom_display_name', cleanName);
        sessionStorage.setItem('zoom_initial_no_audio', noAudio ? 'true' : 'false');
        sessionStorage.setItem('zoom_initial_no_video', noVideo ? 'true' : 'false');
        if (passcode.trim()) {
          sessionStorage.setItem(`zoom_passcode_${meeting.id}`, passcode.trim());
        }
      }
      router.push(`/meeting/${meeting.id}`);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Invalid Meeting ID or meeting not found.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#111317] flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-lg mx-auto w-full flex items-center justify-between pt-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0E71EB] flex items-center justify-center text-white">
            <Video className="w-4 h-4 fill-current" />
          </div>
          <span className="font-bold text-lg text-[#0E71EB] tracking-tight">zoom</span>
        </div>
      </div>

      {/* Join Card */}
      <div className="max-w-md mx-auto w-full my-auto bg-white dark:bg-[#1E2024] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Join Meeting</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter the meeting ID or paste an invite link to join
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Meeting ID or Personal Link
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 849 204 1284 or paste invitation link"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#0E71EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Your Display Name
            </label>
            <input
              type="text"
              required
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#0E71EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Passcode <span className="text-slate-400 font-normal">(if required)</span>
            </label>
            <input
              type="text"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#0E71EB]"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={noAudio}
                onChange={(e) => setNoAudio(e.target.checked)}
                className="rounded border-slate-300 text-[#0E71EB]"
              />
              <span>Do not connect to audio</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={noVideo}
                onChange={(e) => setNoVideo(e.target.checked)}
                className="rounded border-slate-300 text-[#0E71EB]"
              />
              <span>Turn off my video</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-70 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Meeting...</span>
              </>
            ) : (
              <>
                <span>Join Meeting</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-slate-400 pb-4">
        Zoom Clone Platform
      </div>
    </div>
  );
}
