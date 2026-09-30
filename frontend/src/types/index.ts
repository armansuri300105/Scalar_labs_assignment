export interface SecuritySettings {
  is_locked: boolean;
  allow_share_screen: boolean;
  allow_chat: boolean;
  allow_rename: boolean;
  allow_unmute: boolean;
}

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
  owner_id?: string | null;
  is_locked?: boolean;
  allow_share_screen?: boolean;
  allow_chat?: boolean;
  allow_rename?: boolean;
  allow_unmute?: boolean;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  invite_url?: string;
  participants?: Participant[];
  chat_messages?: ChatMessage[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserRegisterInput {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
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
