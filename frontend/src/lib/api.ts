import {
  Meeting,
  Participant,
  ChatMessage,
  CreateInstantMeetingInput,
  CreateScheduledMeetingInput,
  JoinMeetingInput
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // use fallback status
      }
      throw new ApiError(errorMsg, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError((err as Error).message || 'Network connection error. Is the backend server running?', 500);
  }
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; timestamp: string }>('/api/health'),

  // Meetings
  getUpcomingMeetings: () => request<Meeting[]>('/api/meetings?view=upcoming'),
  getRecentMeetings: () => request<Meeting[]>('/api/meetings?view=recent'),
  getAllMeetings: () => request<Meeting[]>('/api/meetings?view=all'),

  createInstantMeeting: (data: CreateInstantMeetingInput = {}) =>
    request<Meeting>('/api/meetings/instant', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  createScheduledMeeting: (data: CreateScheduledMeetingInput) =>
    request<Meeting>('/api/meetings/scheduled', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  resolveMeeting: (query: string) =>
    request<Meeting>('/api/meetings/resolve', {
      method: 'POST',
      body: JSON.stringify({ query })
    }),

  getMeetingDetails: (meetingId: string) =>
    request<Meeting>(`/api/meetings/${encodeURIComponent(meetingId)}`),

  getMeetingByInviteToken: (token: string) =>
    request<Meeting>(`/api/invites/${encodeURIComponent(token)}`),

  // Join & Participants
  joinMeeting: (meetingId: string, data: JoinMeetingInput) =>
    request<Participant>(`/api/meetings/${encodeURIComponent(meetingId)}/join`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  leaveMeeting: (meetingId: string, participantId: string) =>
    request<{ message: string }>(`/api/meetings/${encodeURIComponent(meetingId)}/leave?participant_id=${encodeURIComponent(participantId)}`, {
      method: 'POST'
    }),

  getParticipants: (meetingId: string) =>
    request<Participant[]>(`/api/meetings/${encodeURIComponent(meetingId)}/participants`),

  updateParticipantState: (
    meetingId: string,
    participantId: string,
    updates: { is_muted?: boolean; is_video_off?: boolean; is_hand_raised?: boolean }
  ) =>
    request<Participant>(`/api/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}/status`, {
      method: 'POST',
      body: JSON.stringify(updates)
    }),

  // Host Controls
  muteAll: (meetingId: string) =>
    request<{ message: string }>(`/api/meetings/${encodeURIComponent(meetingId)}/mute-all`, {
      method: 'POST'
    }),

  removeParticipant: (meetingId: string, participantId: string) =>
    request<{ message: string }>(`/api/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}`, {
      method: 'DELETE'
    }),

  endMeeting: (meetingId: string) =>
    request<{ message: string }>(`/api/meetings/${encodeURIComponent(meetingId)}/end`, {
      method: 'POST'
    }),

  // In-Meeting Chat
  getChatMessages: (meetingId: string) =>
    request<ChatMessage[]>(`/api/meetings/${encodeURIComponent(meetingId)}/messages`),

  sendChatMessage: (meetingId: string, message: { sender_name: string; sender_role?: string; message: string }) =>
    request<ChatMessage>(`/api/meetings/${encodeURIComponent(meetingId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(message)
    })
};
