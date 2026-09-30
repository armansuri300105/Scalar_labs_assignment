'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PreJoinLobby } from '../../../components/meeting/PreJoinLobby';
import { MeetingHeader } from '../../../components/meeting/MeetingHeader';
import { VideoGrid } from '../../../components/meeting/VideoGrid';
import { TileParticipant } from '../../../components/meeting/VideoTile';
import { MeetingControls } from '../../../components/meeting/MeetingControls';
import { ParticipantsPanel } from '../../../components/meeting/ParticipantsPanel';
import { ChatPanel } from '../../../components/meeting/ChatPanel';
import { SecurityModal } from '../../../components/meeting/SecurityModal';
import { ReactionsOverlay, FloatingReaction } from '../../../components/meeting/ReactionsOverlay';
import { InviteModal } from '../../../components/modals/InviteModal';
import { Meeting, Participant, ChatMessage } from '../../../types';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;
  const { success, error, info } = useToast();

  // Meeting State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [meetingNotFound, setMeetingNotFound] = useState(false);

  // Lobby vs Room State
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Self Participant Info
  const [selfParticipant, setSelfParticipant] = useState<Participant | null>(null);
  const [currentDisplayName, setCurrentDisplayName] = useState('Mohammed Arshad');
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Media Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [screenShareBy, setScreenShareBy] = useState<string | null>(null);

  // UI Panels & Layout
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Chat & Reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Participants in Room (Self + Remotes/Simulated)
  const [roomParticipants, setRoomParticipants] = useState<TileParticipant[]>([]);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch Meeting Details on Mount
  useEffect(() => {
    async function loadMeeting() {
      try {
        setIsLoadingMeeting(true);
        const data = await api.getMeetingDetails(meetingId);
        setMeeting(data);
        if (data.chat_messages) {
          setChatMessages(data.chat_messages);
        }
      } catch (err: unknown) {
        console.error('Failed to load meeting:', err);
        setMeetingNotFound(true);
      } finally {
        setIsLoadingMeeting(false);
      }
    }
    loadMeeting();
  }, [meetingId]);

  // 2. Handle Joining from Lobby
  const handleLobbyJoin = async (displayName: string, initialMuted: boolean, initialVideoOff: boolean) => {
    if (!meeting) return;
    try {
      setIsJoining(true);
      setCurrentDisplayName(displayName);
      setIsMuted(initialMuted);
      setIsVideoOff(initialVideoOff);

      // Determine role: host if name matches host_name
      const role = displayName.trim().toLowerCase() === meeting.host_name.trim().toLowerCase() ? 'host' : 'participant';
      setIsHost(role === 'host');

      // Call API to join
      const participant = await api.joinMeeting(meeting.id, {
        display_name: displayName,
        role
      });
      setSelfParticipant(participant);

      // Start local media stream if video enabled
      if (!initialVideoOff) {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: true
            });
            // Apply initial mute state to audio track
            stream.getAudioTracks().forEach((t) => (t.enabled = !initialMuted));
            setLocalStream(stream);
          }
        } catch (mediaErr) {
          console.warn('Could not acquire local camera/mic stream:', mediaErr);
          setIsVideoOff(true);
        }
      }

      // Fetch existing active participants in this meeting from the backend
      let existingPeers: TileParticipant[] = [];
      try {
        const activeList: Participant[] = await api.getParticipants(meeting.id);
        existingPeers = (activeList || [])
          .filter((p: Participant) => p.id !== participant.id && !p.left_at)
          .map((p: Participant) => ({
            id: p.id,
            displayName: p.display_name,
            role: p.role as 'host' | 'participant',
            isSelf: false,
            isMuted: p.is_muted ?? false,
            isVideoOff: p.is_video_off ?? false,
            isSpeaking: false,
            isHandRaised: p.is_hand_raised ?? false
          }));
      } catch (fetchErr) {
        console.warn('Could not fetch existing participants:', fetchErr);
      }

      const initialParticipants: TileParticipant[] = [
        {
          id: participant.id,
          displayName: participant.display_name,
          role: participant.role as 'host' | 'participant',
          isSelf: true,
          isMuted: initialMuted,
          isVideoOff: initialVideoOff,
          isSpeaking: false,
          isHandRaised: false
        },
        ...existingPeers
      ];
      setRoomParticipants(initialParticipants);

      // Connect WebSocket
      connectWebSocket(meeting.id, participant.id, displayName, role);

      setHasJoined(true);
      success(`Joined meeting as ${displayName}`);
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to join meeting.');
    } finally {
      setIsJoining(false);
    }
  };

  // 3. WebSocket Connection
  const connectWebSocket = useCallback((mId: string, pId: string, name: string, role: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://scalar-labs-assignment.onrender.com';
      const cleanUrl = apiUrl.replace(/\/+$/, '');
      const protocol = cleanUrl.startsWith('https://')
        ? 'wss:'
        : cleanUrl.startsWith('http://')
        ? 'ws:'
        : (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:');
      const host = cleanUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${protocol}//${host}/ws/meeting/${mId}?display_name=${encodeURIComponent(name)}&participant_id=${encodeURIComponent(pId)}&role=${role}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'CHAT_MESSAGE') {
            setChatMessages((prev) => [...prev, data.message]);
            if (!isChatOpen) {
              setUnreadChatCount((prev) => prev + 1);
            }
          } else if (data.type === 'REACTION') {
            triggerReaction(data.emoji, data.sender_name);
          } else if (data.type === 'HOST_MUTED_ALL') {
            setIsMuted(true);
            if (localStream) {
              localStream.getAudioTracks().forEach((t) => (t.enabled = false));
            }
            setRoomParticipants((prev) =>
              prev.map((p) => (p.isSelf ? { ...p, isMuted: true } : p))
            );
            info('The host muted all participants.');
          } else if (data.type === 'PARTICIPANT_REMOVED') {
            if (data.participant_id === pId) {
              error('You were removed from the meeting by the host.');
              cleanupAndLeave();
            } else {
              setRoomParticipants((prev) => prev.filter((p) => p.id !== data.participant_id));
            }
          } else if (data.type === 'MEETING_ENDED') {
            info('The host has ended this meeting.');
            cleanupAndLeave();
          } else if (data.type === 'PARTICIPANT_JOINED') {
            const newP = data.participant;
            if (newP && newP.id !== pId) {
              setRoomParticipants((prev) => {
                if (prev.some((p) => p.id === newP.id)) return prev;
                return [
                  ...prev,
                  {
                    id: newP.id,
                    displayName: newP.display_name,
                    role: newP.role,
                    isSelf: false,
                    isMuted: newP.is_muted ?? false,
                    isVideoOff: newP.is_video_off ?? false,
                    isSpeaking: false,
                    isHandRaised: false
                  }
                ];
              });
              info(`${newP.display_name} joined the meeting.`);
            }
          } else if (data.type === 'PARTICIPANT_UPDATED') {
            const updated = data.participant;
            if (updated) {
              setRoomParticipants((prev) =>
                prev.map((p) =>
                  p.id === updated.id
                    ? {
                        ...p,
                        displayName: updated.display_name ?? p.displayName,
                        role: updated.role ?? p.role,
                        isMuted: updated.is_muted ?? p.isMuted,
                        isVideoOff: updated.is_video_off ?? p.isVideoOff,
                        isHandRaised: updated.is_hand_raised ?? p.isHandRaised
                      }
                    : p
                )
              );
            }
          } else if (data.type === 'PARTICIPANT_LEFT') {
            setRoomParticipants((prev) => prev.filter((p) => p.id !== data.participant_id));
            if (data.display_name) {
              info(`${data.display_name} left the meeting.`);
            }
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onerror = (err) => console.warn('WebSocket connection notice:', err);
    } catch (wsErr) {
      console.warn('Could not establish WebSocket connection:', wsErr);
    }
  }, [isChatOpen, localStream, info, error]);

  // Sync local stream with self participant tile
  useEffect(() => {
    if (localStream && selfParticipant) {
      setRoomParticipants((prev) =>
        prev.map((p) =>
          p.isSelf ? { ...p, stream: localStream, isVideoOff, isMuted } : p
        )
      );
    }
  }, [localStream, isVideoOff, isMuted, selfParticipant]);

  // Real microphone audio level detection for speaking highlight
  useEffect(() => {
    if (!localStream || isMuted || !hasJoined) {
      setRoomParticipants((prev) =>
        prev.map((p) => (p.isSelf && p.isSpeaking ? { ...p, isSpeaking: false } : p))
      );
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(localStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const speaking = avg > 20;

        setRoomParticipants((prev) =>
          prev.map((p) => (p.isSelf && p.isSpeaking !== speaking ? { ...p, isSpeaking: speaking } : p))
        );

        animId = requestAnimationFrame(checkVolume);
      };

      animId = requestAnimationFrame(checkVolume);
    } catch {
      // AudioContext error or denied
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [localStream, isMuted, hasJoined]);

  // Trigger floating reaction animation
  const triggerReaction = (emoji: string, senderName: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const leftPercent = Math.floor(20 + Math.random() * 60);
    const reactionObj: FloatingReaction = { id, emoji, senderName, leftPercent };

    setFloatingReactions((prev) => [...prev, reactionObj]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !newMuted));
    }
    setRoomParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, isMuted: newMuted } : p))
    );
    if (selfParticipant && meeting) {
      api.updateParticipantState(meeting.id, selfParticipant.id, { is_muted: newMuted }).catch(() => {});
    }
  };

  // Toggle Video
  const handleToggleVideo = async () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);

    if (newVideoOff) {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => (track.enabled = false));
      }
    } else {
      if (localStream && localStream.getVideoTracks().length > 0) {
        localStream.getVideoTracks().forEach((track) => (track.enabled = true));
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
          setLocalStream(stream);
        } catch {
          console.warn('Failed to restart video track');
        }
      }
    }

    setRoomParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, isVideoOff: newVideoOff } : p))
    );
    if (selfParticipant && meeting) {
      api.updateParticipantState(meeting.id, selfParticipant.id, { is_video_off: newVideoOff }).catch(() => {});
    }
  };

  // Toggle Raise Hand
  const handleToggleHand = () => {
    const newHand = !isHandRaised;
    setIsHandRaised(newHand);
    setRoomParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, isHandRaised: newHand } : p))
    );
    if (selfParticipant && meeting) {
      api.updateParticipantState(meeting.id, selfParticipant.id, { is_hand_raised: newHand }).catch(() => {});
    }
    if (newHand) {
      triggerReaction('✋', currentDisplayName);
    }
  };

  // Toggle Screen Sharing (Zoom green button)
  const handleToggleScreenShare = async () => {
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((t) => t.stop());
      setScreenShareStream(null);
      setScreenShareBy(null);
      success('Screen sharing stopped.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenShareStream(stream);
        setScreenShareBy(currentDisplayName);
        success('You are now sharing your screen.');

        stream.getVideoTracks()[0].onended = () => {
          setScreenShareStream(null);
          setScreenShareBy(null);
          info('Screen sharing ended.');
        };
      } else {
        error('Screen sharing is not supported by your browser.');
      }
    } catch (err: unknown) {
      console.warn('Screen share canceled or denied:', err);
    }
  };

  // Send Reaction
  const handleSendReaction = (emoji: string) => {
    triggerReaction(emoji, currentDisplayName);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REACTION', emoji }));
    }
  };

  // Send In-Meeting Chat Message
  const handleSendMessage = async (text: string) => {
    if (!meeting) return;
    try {
      const newMsg = await api.sendChatMessage(meeting.id, {
        sender_name: currentDisplayName,
        sender_role: isHost ? 'host' : 'participant',
        message: text
      });
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err: unknown) {
      error('Failed to send message.');
    }
  };

  // Host Control: Mute All
  const handleMuteAll = async () => {
    if (!meeting) return;
    try {
      await api.muteAll(meeting.id);
      setRoomParticipants((prev) =>
        prev.map((p) => (p.role !== 'host' ? { ...p, isMuted: true } : p))
      );
      success('All participants have been muted.');
    } catch {
      error('Failed to mute all participants.');
    }
  };

  // Host Control: Remove Participant
  const handleRemoveParticipant = async (participantId: string) => {
    if (!meeting) return;
    try {
      await api.removeParticipant(meeting.id, participantId);
      setRoomParticipants((prev) => prev.filter((p) => p.id !== participantId));
      success('Participant removed from meeting.');
    } catch {
      error('Failed to remove participant.');
    }
  };

  // Host Control: Toggle Participant Mute
  const handleToggleParticipantMute = (participantId: string) => {
    setRoomParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isMuted: !p.isMuted } : p))
    );
    success('Participant mute status updated.');
  };

  // Host Control: End Meeting For All
  const handleEndMeetingForAll = async () => {
    if (!meeting) return;
    try {
      await api.endMeeting(meeting.id);
      success('Meeting ended for everyone.');
      cleanupAndLeave();
    } catch {
      error('Failed to end meeting.');
    }
  };

  // Leave Meeting
  const handleLeaveMeeting = async () => {
    if (meeting && selfParticipant) {
      api.leaveMeeting(meeting.id, selfParticipant.id).catch(() => {});
    }
    success('You left the meeting.');
    cleanupAndLeave();
  };

  // Clean up streams and return to dashboard
  const cleanupAndLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((track) => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.push('/');
  };

  // Loading Screen
  if (isLoadingMeeting) {
    return (
      <div className="min-h-screen bg-[#111317] text-white flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Loading Zoom meeting room...</p>
      </div>
    );
  }

  // Not Found Screen
  if (meetingNotFound || !meeting) {
    return (
      <div className="min-h-screen bg-[#111317] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
          !
        </div>
        <h1 className="text-2xl font-bold">Meeting Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md">
          The meeting ID or invitation token does not correspond to an active meeting in the system.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-[#0E71EB] hover:bg-blue-600 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Stage 1: Pre-Join Lobby
  if (!hasJoined) {
    return (
      <PreJoinLobby
        meeting={meeting}
        onJoin={handleLobbyJoin}
        isJoining={isJoining}
      />
    );
  }

  // Stage 2: Active Meeting Room
  return (
    <div className="h-screen w-screen bg-[#111317] text-white flex flex-col overflow-hidden select-none relative">
      {/* Floating Reactions Animation Overlay */}
      <ReactionsOverlay reactions={floatingReactions} />

      {/* Meeting Header */}
      <MeetingHeader
        meeting={meeting}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery')}
      />

      {/* Center Body: Video Grid + Side Panels (Participants, Chat) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Adaptive Video Grid */}
        <VideoGrid
          participants={roomParticipants}
          viewMode={viewMode}
          screenShareStream={screenShareStream}
          screenShareBy={screenShareBy}
        />

        {/* Participants Panel */}
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          participants={roomParticipants}
          isHost={isHost}
          onMuteAll={handleMuteAll}
          onRemoveParticipant={handleRemoveParticipant}
          onToggleParticipantMute={handleToggleParticipantMute}
          onOpenInvite={() => setIsInviteModalOpen(true)}
        />

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setUnreadChatCount(0);
          }}
          messages={chatMessages}
          currentUserName={currentDisplayName}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Meeting Controls Bottom Toolbar */}
      <MeetingControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isHandRaised={isHandRaised}
        isScreenSharing={!!screenShareStream}
        isRecording={isRecording}
        isHost={isHost}
        participantCount={roomParticipants.length}
        unreadChatCount={unreadChatCount}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleHand={handleToggleHand}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={() => {
          setIsRecording(!isRecording);
          info(!isRecording ? 'Recording started.' : 'Recording paused.');
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (!isParticipantsOpen) setIsChatOpen(false);
        }}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (!isChatOpen) {
            setUnreadChatCount(0);
            setIsParticipantsOpen(false);
          }
        }}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onSendReaction={handleSendReaction}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForAll={handleEndMeetingForAll}
      />

      {/* Security Modal */}
      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        isLocked={isLocked}
        onToggleLock={() => {
          setIsLocked(!isLocked);
          info(!isLocked ? 'Meeting locked. No new participants can join.' : 'Meeting unlocked.');
        }}
      />

      {/* Invite Modal in-meeting */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        meeting={meeting}
        onJoinMeeting={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
