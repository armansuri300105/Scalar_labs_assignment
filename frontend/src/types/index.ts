export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  meeting_type: 'instant' | 'scheduled';
  scheduled_at?: string | null;
  duration_minutes: number;
  host_name: string;
  invite_token: string;
  passcode?: string | null;
  status: 'scheduled' | 'active' | 'ended';
  created_at: string;
  updated_at: string;
  participant_count?: number;
  invite_url?: string;
  participants?: Participant[];
  chat_messages?: ChatMessage[];
}

export interface Participant {
  id: string;
  meeting_id: string;
  display_name: string;
  role: 'host' | 'participant';
  is_muted: boolean;
  is_video_off: boolean;
  is_hand_raised: boolean;
  joined_at: string;
  left_at?: string | null;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  sent_at: string;
}

export interface CreateInstantMeetingInput {
  title?: string;
  host_name?: string;
}

export interface CreateScheduledMeetingInput {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  host_name?: string;
  passcode?: string;
}

export interface ResolveMeetingInput {
  query: string;
}

export interface JoinMeetingInput {
  display_name: string;
  passcode?: string;
  role?: string;
}
