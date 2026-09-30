'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { ClockWidget } from '../components/dashboard/ClockWidget';
import { QuickActions } from '../components/dashboard/QuickActions';
import { UpcomingMeetings } from '../components/dashboard/UpcomingMeetings';
import { RecentMeetings } from '../components/dashboard/RecentMeetings';
import { JoinModal } from '../components/modals/JoinModal';
import { ScheduleModal } from '../components/modals/ScheduleModal';
import { RescheduleModal } from '../components/modals/RescheduleModal';
import { DeleteMeetingModal } from '../components/modals/DeleteMeetingModal';
import { InviteModal } from '../components/modals/InviteModal';
import { Meeting } from '../types';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { success, error, info } = useToast();
  const { user, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<'home' | 'meetings' | 'recordings'>('home');
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInviteMeeting, setSelectedInviteMeeting] = useState<Meeting | null>(null);
  const [selectedRescheduleMeeting, setSelectedRescheduleMeeting] = useState<Meeting | null>(null);
  const [selectedDeleteMeeting, setSelectedDeleteMeeting] = useState<Meeting | null>(null);
  const [isStartingInstant, setIsStartingInstant] = useState(false);

  // Fetch upcoming and recent meetings from FastAPI backend for the authenticated user
  const fetchMeetings = useCallback(async () => {
    if (!user) {
      setUpcomingMeetings([]);
      setRecentMeetings([]);
      setIsLoadingMeetings(false);
      return;
    }

    try {
      setIsLoadingMeetings(true);
      const [upcoming, recent] = await Promise.all([
        api.getUpcomingMeetings().catch(() => []),
        api.getRecentMeetings().catch(() => [])
      ]);
      setUpcomingMeetings(upcoming);
      setRecentMeetings(recent);
    } catch (err: unknown) {
      console.error('Error fetching meetings:', err);
    } finally {
      setIsLoadingMeetings(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Handler: Instant meeting creation (requires authentication)
  const handleStartInstantMeeting = async () => {
    if (!user) {
      info('Please sign in or create an account to start a new meeting.');
      openAuthModal('login');
      return;
    }

    try {
      setIsStartingInstant(true);
      const hostName = user.full_name || 'Host User';

      const meeting = await api.createInstantMeeting({
        title: `${hostName}'s Instant Meeting`,
        host_name: hostName
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zoom_display_name', hostName);
        sessionStorage.setItem('zoom_is_host', 'true');
        sessionStorage.setItem(`zoom_is_host_${meeting.id}`, 'true');
        localStorage.setItem(`zoom_is_host_${meeting.id}`, 'true');
        sessionStorage.setItem('zoom_initial_no_audio', 'false');
        sessionStorage.setItem('zoom_initial_no_video', 'false');
      }

      success('Instant meeting created! Connecting to room...');
      router.push(`/meeting/${meeting.id}`);
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to start instant meeting.');
      setIsStartingInstant(false);
    }
  };

  // Handler: Open Schedule Modal (requires authentication)
  const handleOpenScheduleModal = () => {
    if (!user) {
      info('Please sign in or create an account to schedule meetings.');
      openAuthModal('login');
      return;
    }
    setIsScheduleModalOpen(true);
  };

  // Handler: Join meeting from card or modal
  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/meeting/${meetingId}`);
  };

  // Handler: When a scheduled meeting is created
  const handleMeetingScheduled = (meeting: Meeting) => {
    setUpcomingMeetings((prev) => [meeting, ...prev]);
    setSelectedInviteMeeting(meeting);
  };

  // Handler: When a meeting is rescheduled / updated
  const handleMeetingRescheduled = (updated: Meeting) => {
    setUpcomingMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setRecentMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  // Handler: When a meeting is deleted
  const handleMeetingDeleted = (meetingId: string) => {
    setUpcomingMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    setRecentMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  // Handler: Share screen action
  const handleShareScreen = () => {
    setIsJoinModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#111317]">
      {/* Top Navbar */}
      <DashboardNavbar />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Top Row: Quick Actions + Real-Time Clock */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Quick Actions (4 Iconic Buttons) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#1E2024] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex items-center justify-center">
                <QuickActions
                  onStartInstantMeeting={handleStartInstantMeeting}
                  onOpenJoinModal={() => setIsJoinModalOpen(true)}
                  onOpenScheduleModal={handleOpenScheduleModal}
                  onShareScreen={handleShareScreen}
                  isStartingInstant={isStartingInstant}
                />
              </div>

              {/* Live Clock Card */}
              <div className="lg:col-span-5">
                <ClockWidget />
              </div>
            </div>

            {/* Guest Banner if not signed in */}
            {!user && (
              <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Guest Access Enabled
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    You can join any meeting with a Meeting ID or link without signing in. To create, host, or schedule your own meetings, sign in or create an account.
                  </p>
                </div>
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 bg-[#0E71EB] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-sm cursor-pointer"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {/* Meetings Lists: Upcoming & Recent */}
            <div className="grid grid-cols-1 gap-8">
              {/* Upcoming Meetings */}
              <UpcomingMeetings
                meetings={upcomingMeetings}
                isLoading={isLoadingMeetings}
                onOpenScheduleModal={handleOpenScheduleModal}
                onOpenInviteModal={(meeting) => setSelectedInviteMeeting(meeting)}
                onJoinMeeting={handleJoinMeeting}
                onRescheduleMeeting={(meeting) => setSelectedRescheduleMeeting(meeting)}
                onDeleteMeeting={(meeting) => setSelectedDeleteMeeting(meeting)}
              />

              {/* Recent Meetings */}
              <RecentMeetings
                meetings={recentMeetings}
                isLoading={isLoadingMeetings}
                onJoinMeeting={handleJoinMeeting}
                onDeleteMeeting={(meeting) => setSelectedDeleteMeeting(meeting)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onMeetingScheduled={handleMeetingScheduled}
      />

      <RescheduleModal
        isOpen={!!selectedRescheduleMeeting}
        onClose={() => setSelectedRescheduleMeeting(null)}
        meeting={selectedRescheduleMeeting}
        onMeetingRescheduled={handleMeetingRescheduled}
      />

      <DeleteMeetingModal
        isOpen={!!selectedDeleteMeeting}
        onClose={() => setSelectedDeleteMeeting(null)}
        meeting={selectedDeleteMeeting}
        onMeetingDeleted={handleMeetingDeleted}
      />

      <InviteModal
        isOpen={!!selectedInviteMeeting}
        onClose={() => setSelectedInviteMeeting(null)}
        meeting={selectedInviteMeeting}
        onJoinMeeting={handleJoinMeeting}
      />
    </div>
  );
}
