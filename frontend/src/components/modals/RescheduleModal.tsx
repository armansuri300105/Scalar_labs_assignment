'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Shield, Loader2, CalendarClock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { Meeting } from '../../types';
import { useToast } from '../../context/ToastContext';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onMeetingRescheduled: (updatedMeeting: Meeting) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  meeting,
  onMeetingRescheduled
}: RescheduleModalProps) {
  const { success, error } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(45);
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');
      
      const targetDate = meeting.scheduled_at ? new Date(meeting.scheduled_at) : new Date();
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);

      const hh = String(targetDate.getHours()).padStart(2, '0');
      const min = String(targetDate.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${min}`);

      setDuration(meeting.duration_minutes || 45);
      setPasscode(meeting.passcode || '');
    }
  }, [meeting, isOpen]);

  if (!meeting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      error('Please enter a meeting topic.');
      return;
    }

    try {
      setIsSubmitting(true);
      const scheduledDateTime = new Date(`${date}T${time}:00`);

      const updated = await api.rescheduleMeeting(meeting.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDateTime.toISOString(),
        duration_minutes: Number(duration),
        passcode: passcode.trim() || undefined
      });

      success(`Meeting "${updated.title}" rescheduled successfully!`);
      onMeetingRescheduled(updated);
      onClose();
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to reschedule meeting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Meeting" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Intro */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-[#0E71EB] dark:text-blue-400 text-xs">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span>Update the date, time, duration, or details for this meeting.</span>
        </div>

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
              New Date
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
              New Start Time
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

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Reschedule</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
