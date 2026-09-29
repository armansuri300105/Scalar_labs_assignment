'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../../lib/api';
import { Meeting } from '../../../types';

export default function InviteResolverPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function resolveInvite() {
      if (!token) return;
      try {
        setIsLoading(true);
        const resolved = await api.getMeetingByInviteToken(token);
        setMeeting(resolved);
        // Automatically redirect to the meeting room pre-join screen
        setTimeout(() => {
          router.replace(`/meeting/${resolved.id}`);
        }, 1200);
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Invalid or expired invitation link.');
        setIsLoading(false);
      }
    }

    resolveInvite();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1C1F26] p-8 rounded-2xl border border-white/10 text-center space-y-6 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#0E71EB] flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-500/30">
          <Video className="w-8 h-8 fill-current" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0E71EB] mx-auto" />
            <h2 className="text-lg font-bold">Connecting to Zoom Meeting...</h2>
            <p className="text-xs text-slate-400">
              Resolving invitation link and verifying room status
            </p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-400">Meeting Not Found</h2>
              <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0E71EB] hover:bg-blue-600 rounded-xl text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-emerald-400">Meeting Found!</h2>
            <p className="text-sm font-semibold text-white">{meeting?.title}</p>
            <p className="text-xs text-slate-400">Redirecting to meeting room...</p>
          </div>
        )}
      </div>
    </div>
  );
}
