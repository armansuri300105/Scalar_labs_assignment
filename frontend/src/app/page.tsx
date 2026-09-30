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
import { InviteModal } from '../components/modals/InviteModal';
import { Meeting } from '../types';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'home' | 'meetings' | 'recordings'>('home');
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInviteMeeting, setSelectedInviteMeeting] = useState<Meeting | null>(null);
  const [isStartingInstant, setIsStartingInstant] = useState(false);

  // Fetch upcoming and recent meetings from FastAPI backend
  const fetchMeetings = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Handler: Instant meeting creation
  const handleStartInstantMeeting = async () => {
    try {
      setIsStartingInstant(true);
      const meeting = await api.createInstantMeeting({
        title: "Mohammed Arshad's Instant Meeting",
        host_name: 'Mohammed Arshad'
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('zoom_display_name', 'Mohammed Arshad');
        sessionStorage.setItem('zoom_is_host', 'true');
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

  // Handler: Join meeting from card or modal
  const handleJoinMeeting = (meetingId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('zoom_is_host');
    }
    router.push(`/meeting/${meetingId}`);
  };

  // Handler: When a scheduled meeting is created
  const handleMeetingScheduled = (meeting: Meeting) => {
    setUpcomingMeetings((prev) => [meeting, ...prev]);
    setSelectedInviteMeeting(meeting);
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
                  onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                  onShareScreen={handleShareScreen}
                  isStartingInstant={isStartingInstant}
                />
              </div>

              {/* Live Clock Card */}
              <div className="lg:col-span-5">
                <ClockWidget />
              </div>
            </div>

            {/* Meetings Lists: Upcoming & Recent */}
            <div className="grid grid-cols-1 gap-8">
              {/* Upcoming Meetings */}
              <UpcomingMeetings
                meetings={upcomingMeetings}
                isLoading={isLoadingMeetings}
                onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                onOpenInviteModal={(meeting) => setSelectedInviteMeeting(meeting)}
                onJoinMeeting={handleJoinMeeting}
              />

              {/* Recent Meetings */}
              <RecentMeetings
                meetings={recentMeetings}
                isLoading={isLoadingMeetings}
                onJoinMeeting={handleJoinMeeting}
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

      <InviteModal
        isOpen={!!selectedInviteMeeting}
        onClose={() => setSelectedInviteMeeting(null)}
        meeting={selectedInviteMeeting}
        onJoinMeeting={handleJoinMeeting}
      />
    </div>
  );
}
