'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, MicOff, VideoOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeetingId?: string;
}

export function JoinModal({ isOpen, onClose, initialMeetingId = '' }: JoinModalProps) {
  const router = useRouter();
  const { error } = useToast();

  const [query, setQuery] = useState(initialMeetingId);
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
      // Validate meeting exists
      const meeting = await api.resolveMeeting(cleanQuery);
      
      // Save display name & audio/video initial preferences to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zoom_display_name', cleanName);
        sessionStorage.setItem('zoom_initial_no_audio', noAudio ? 'true' : 'false');
        sessionStorage.setItem('zoom_initial_no_video', noVideo ? 'true' : 'false');
        if (passcode.trim()) {
          sessionStorage.setItem(`zoom_passcode_${meeting.id}`, passcode.trim());
        }
      }

      onClose();
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
    <Modal isOpen={isOpen} onClose={onClose} title="Join Meeting">
      <form onSubmit={handleJoin} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Meeting ID or link */}
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
          />
        </div>

        {/* Display Name */}
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
          />
        </div>

        {/* Passcode (optional) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Meeting Passcode <span className="text-slate-400 font-normal">(if required)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 847291"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
          />
        </div>

        {/* Join Options */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noAudio}
              onChange={(e) => setNoAudio(e.target.checked)}
              className="rounded border-slate-300 text-[#0E71EB] focus:ring-[#0E71EB]"
            />
            <span>Do not connect to audio</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noVideo}
              onChange={(e) => setNoVideo(e.target.checked)}
              className="rounded border-slate-300 text-[#0E71EB] focus:ring-[#0E71EB]"
            />
            <span>Turn off my video</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-70 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span>Join Meeting</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
