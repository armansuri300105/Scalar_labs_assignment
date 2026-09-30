'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { Meeting } from '../../types';
import { formatMeetingId } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface DeleteMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onMeetingDeleted: (meetingId: string) => void;
}

export function DeleteMeetingModal({
  isOpen,
  onClose,
  meeting,
  onMeetingDeleted
}: DeleteMeetingModalProps) {
  const { success, error } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!meeting) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.deleteMeeting(meeting.id);
      success(`Meeting "${meeting.title}" was deleted.`);
      onMeetingDeleted(meeting.id);
      onClose();
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to delete meeting.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Meeting" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Warning Icon & Banner */}
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-900 dark:text-red-300">
              Permanently delete this meeting?
            </h4>
            <p className="text-xs text-red-700/90 dark:text-red-400/90 leading-relaxed">
              This action cannot be undone. All meeting data, invitation links, participant logs, and chat records for this meeting will be permanently removed.
            </p>
          </div>
        </div>

        {/* Meeting Details Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-semibold text-slate-900 dark:text-white truncate">
            {meeting.title}
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>Meeting ID:</span>
            <code className="font-mono text-slate-800 dark:text-slate-200">
              {formatMeetingId(meeting.id)}
            </code>
          </div>
          {meeting.scheduled_at && (
            <div className="text-slate-500 dark:text-slate-400">
              Scheduled: {new Date(meeting.scheduled_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-xs font-semibold rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Meeting</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
