'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Shield, Video, Users, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { Meeting } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingScheduled: (meeting: Meeting) => void;
}

export function ScheduleModal({ isOpen, onClose, onMeetingScheduled }: ScheduleModalProps) {
  const { success, error } = useToast();
  const { user, openAuthModal } = useAuth();

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultTime = `${String(nextHour.getHours()).padStart(2, '0')}:00`;

  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState(() => {
    if (user?.full_name) return user.full_name;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zoom_user_name') || sessionStorage.getItem('zoom_display_name') || 'Host User';
    }
    return 'Host User';
  });

  React.useEffect(() => {
    if (user?.full_name) {
      setHostName(user.full_name);
    }
  }, [user]);

  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(45);
  const [passcode, setPasscode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [hostVideo, setHostVideo] = useState(true);
  const [participantVideo, setParticipantVideo] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      error('Please sign in or create an account to schedule a meeting.');
      openAuthModal('login');
      return;
    }

    if (!title.trim()) {
      error('Please enter a meeting topic.');
      return;
    }

    try {
      setIsSubmitting(true);
      const scheduledDateTime = new Date(`${date}T${time}:00`);

      const newMeeting = await api.createScheduledMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_minutes: Number(duration),
        host_name: hostName.trim() || 'Host User',
        passcode: passcode.trim() || undefined
      });

      success(`Meeting "${newMeeting.title}" scheduled successfully!`);
      onMeetingScheduled(newMeeting);
      onClose();
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to schedule meeting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Meeting" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Topic */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Topic / Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint Architecture Sync"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agenda, notes, or discussion points..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB] resize-none"
          />
        </div>

        {/* When: Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Start Time
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
            />
          </div>
        </div>

        {/* Duration & Passcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Passcode
            </label>
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0E71EB]/20 focus:border-[#0E71EB]"
            />
          </div>
        </div>

        {/* Video Options */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Video Settings
          </span>
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hostVideo}
                onChange={(e) => setHostVideo(e.target.checked)}
                className="rounded border-slate-300 text-[#0E71EB] focus:ring-[#0E71EB]"
              />
              <span>Host video On</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={participantVideo}
                onChange={(e) => setParticipantVideo(e.target.checked)}
                className="rounded border-slate-300 text-[#0E71EB] focus:ring-[#0E71EB]"
              />
              <span>Participants video On</span>
            </label>
          </div>
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
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-70 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <span>Save & Schedule</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
