import { Meeting } from '../types';

export function formatMeetingId(id: string): string {
  if (!id) return '';
  const cleaned = id.replace(/[^0-9a-zA-Z]/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  return cleaned;
}

export function parseDate(dateInput?: string | null): Date | null {
  if (!dateInput) return null;
  let str = dateInput.trim();
  // If the server string is an ISO datetime without timezone suffix (e.g. 2026-09-30T15:00:00),
  // append 'Z' so it is parsed as UTC and converted to local time in the user's browser.
  if (str.includes('T') && !str.endsWith('Z') && !str.match(/[+-]\d{2}:?\d{2}$/)) {
    str += 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatTime(dateInput?: string | null): string {
  const d = parseDate(dateInput);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateTime(dateInput?: string | null): string {
  const d = parseDate(dateInput);
  if (!d) return 'Unscheduled';
  const now = new Date();
  
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
  }
}

export function getFullInviteUrl(tokenOrId: string, isToken: boolean = true): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return isToken ? `${origin}/invite/${tokenOrId}` : `${origin}/meeting/${tokenOrId}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

export function buildZoomInviteText(meeting: Meeting): string {
  const inviteUrl = getFullInviteUrl(meeting.invite_token, true);
  const formattedId = formatMeetingId(meeting.id);
  const dateStr = formatDateTime(meeting.scheduled_at);

  let text = `${meeting.host_name} is inviting you to a Zoom meeting.\n\n`;
  text += `Topic: ${meeting.title}\n`;
  if (meeting.scheduled_at) {
    text += `Time: ${dateStr}\n`;
  }
  text += `\nJoin Zoom Meeting\n${inviteUrl}\n\n`;
  text += `Meeting ID: ${formattedId}\n`;
  if (meeting.passcode) {
    text += `Passcode: ${meeting.passcode}\n`;
  }
  return text;
}
