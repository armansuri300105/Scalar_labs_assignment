'use client';

import React from 'react';
import { Copy, Check, ExternalLink, Link as LinkIcon, Share2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Meeting } from '../../types';
import { buildZoomInviteText, getFullInviteUrl, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onJoinMeeting: (meetingId: string) => void;
}

export function InviteModal({ isOpen, onClose, meeting, onJoinMeeting }: InviteModalProps) {
  const { success, error } = useToast();

  if (!meeting) return null;

  const fullText = buildZoomInviteText(meeting);
  const inviteUrl = getFullInviteUrl(meeting.invite_token, true);

  const handleCopyFull = async () => {
    const copied = await copyToClipboard(fullText);
    if (copied) success('Meeting invitation copied to clipboard!');
    else error('Failed to copy invitation.');
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(inviteUrl);
    if (copied) success('Invite link copied to clipboard!');
    else error('Failed to copy link.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zoom Meeting Invitation" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Quick Link bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono">
              {inviteUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            Copy Link
          </button>
        </div>

        {/* Formatted invitation textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full Invitation Text
          </label>
          <pre className="p-4 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all max-h-56 overflow-y-auto leading-relaxed">
            {fullText}
          </pre>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyFull}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Meeting Invitation</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onJoinMeeting(meeting.id);
              }}
              className="px-4 py-2 bg-[#0E71EB] hover:bg-[#0B5ED7] text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Start Meeting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
