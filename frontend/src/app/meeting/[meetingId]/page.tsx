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
  const [currentDisplayName, setCurrentDisplayName] = useState('');
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

  // WebSocket & WebRTC Refs
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // WebRTC ICE Servers Configuration
  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  // Close and cleanup a specific peer connection
  const cleanupPeerConnection = useCallback((remoteId: string) => {
    const pc = peerConnectionsRef.current.get(remoteId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      peerConnectionsRef.current.delete(remoteId);
    }
    iceCandidatesQueueRef.current.delete(remoteId);
  }, []);

  // Create or return existing RTCPeerConnection for a remote participant
  const createPeerConnection = useCallback((remoteId: string) => {
    const existing = peerConnectionsRef.current.get(remoteId);
    if (existing && existing.connectionState !== 'closed') {
      return existing;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(remoteId, pc);

    // Attach local audio & video tracks to this peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (err) {
          console.warn('Track already added or failed:', err);
        }
      });
    }

    // Send local ICE candidates to remote peer via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'SIGNAL',
            target: remoteId,
            payload: {
              type: 'candidate',
              candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
            }
          })
        );
      }
    };

    // Receive incoming remote audio and video tracks
    pc.ontrack = (event) => {
      console.log(`Received remote track (${event.track.kind}) from ${remoteId}`);
      const remoteStream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);

      setRoomParticipants((prev) =>
        prev.map((p) => {
          if (p.id !== remoteId) return p;
          let currentStream = p.stream;
          if (!currentStream) {
            currentStream = remoteStream;
          } else if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
            currentStream.addTrack(event.track);
          }
          return {
            ...p,
            stream: currentStream
          };
        })
      );
    };

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${remoteId} connection state:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }, []);

  // Initiate WebRTC call (offer) to a target peer
  const initiateCallToPeer = useCallback(
    async (targetId: string) => {
      try {
        const pc = createPeerConnection(targetId);
        if (pc.signalingState !== 'stable') {
          return;
        }
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'SIGNAL',
              target: targetId,
              payload: {
                type: 'offer',
                sdp: offer
              }
            })
          );
        }
      } catch (err) {
        console.error(`Failed to initiate offer to peer ${targetId}:`, err);
      }
    },
    [createPeerConnection]
  );

  // Reliable media acquisition: guarantees microphone acquisition and handles camera gracefully
  const getMediaStream = async (preferVideo: boolean, initialMuted: boolean): Promise<MediaStream | null> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }

    if (preferVideo) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        stream.getAudioTracks().forEach((t) => (t.enabled = !initialMuted));
        return stream;
      } catch (camErr) {
        console.warn('Could not acquire camera with audio, falling back to audio only:', camErr);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      stream.getAudioTracks().forEach((t) => (t.enabled = !initialMuted));
      return stream;
    } catch (audioErr) {
      console.warn('Microphone permission denied or unavailable:', audioErr);
    }

    return null;
  };

  // 1. Fetch Meeting Details on Mount
  useEffect(() => {
    async function loadMeeting() {
      try {
        setIsLoadingMeeting(true);
        const data = await api.getMeetingDetails(meetingId);
        setMeeting(data);
        if (data.chat_messages && Array.isArray(data.chat_messages)) {
          const rawMsgs = data.chat_messages;
          setChatMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            for (const m of [...prev, ...rawMsgs]) {
              if (m && m.id) map.set(m.id, m);
            }
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
            );
          });
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

      // Determine role: host if this browser session created this meeting OR name matches meeting.host_name
      const isCreatorHost =
        typeof window !== 'undefined' &&
        (sessionStorage.getItem(`zoom_is_host_${meeting.id}`) === 'true' ||
          localStorage.getItem(`zoom_is_host_${meeting.id}`) === 'true' ||
          (sessionStorage.getItem('zoom_is_host') === 'true' &&
            displayName.trim().toLowerCase() === meeting.host_name.trim().toLowerCase()) ||
          displayName.trim().toLowerCase() === meeting.host_name.trim().toLowerCase());
      const role = isCreatorHost ? 'host' : 'participant';
      setIsHost(role === 'host');

      // Call API to join
      const participant = await api.joinMeeting(meeting.id, {
        display_name: displayName,
        role
      });
      setSelfParticipant(participant);

      // Start local media stream: microphone is ALWAYS requested, camera if enabled
      const stream = await getMediaStream(!initialVideoOff, initialMuted);
      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
      } else {
        setIsMuted(true);
        setIsVideoOff(true);
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
          isHandRaised: false,
          stream: stream || undefined
        },
        ...existingPeers
      ];
      setRoomParticipants(initialParticipants);

      // Connect WebSocket and pass existing peer IDs for signaling initiation
      connectWebSocket(
        meeting.id,
        participant.id,
        displayName,
        role,
        existingPeers.map((p) => p.id)
      );

      setHasJoined(true);
      success(`Joined meeting as ${displayName}`);
    } catch (err: unknown) {
      error((err as Error).message || 'Failed to join meeting.');
    } finally {
      setIsJoining(false);
    }
  };

  // 3. WebSocket Connection & Signaling
  const connectWebSocket = useCallback(
    (mId: string, pId: string, name: string, role: string, existingPeerIds: string[] = []) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://scalar-labs-assignment.onrender.com';
        const cleanUrl = apiUrl.replace(/\/+$/, '');
        const protocol = cleanUrl.startsWith('https://')
          ? 'wss:'
          : cleanUrl.startsWith('http://')
          ? 'ws:'
          : typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
        const host = cleanUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${protocol}//${host}/ws/meeting/${mId}?display_name=${encodeURIComponent(
          name
        )}&participant_id=${encodeURIComponent(pId)}&role=${role}`;

        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch {}
          wsRef.current = null;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected. Sending peer-ready to existing peers...');
          existingPeerIds.forEach((targetId) => {
            ws.send(
              JSON.stringify({
                type: 'SIGNAL',
                target: targetId,
                payload: { type: 'peer-ready' }
              })
            );
          });

          // Fallback trigger after 2s in case signaling was missed
          setTimeout(() => {
            existingPeerIds.forEach((targetId) => {
              const pc = peerConnectionsRef.current.get(targetId);
              if (!pc || pc.connectionState === 'new' || pc.signalingState === 'stable') {
                initiateCallToPeer(targetId);
              }
            });
          }, 2000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'CHAT_MESSAGE') {
              const incoming = data.message;
              if (incoming && incoming.id) {
                setChatMessages((prev) => {
                  if (prev.some((m) => m.id === incoming.id)) return prev;
                  return [...prev, incoming];
                });
                if (!isChatOpen) {
                  setUnreadChatCount((prev) => prev + 1);
                }
              }
            } else if (data.type === 'REACTION') {
              triggerReaction(data.emoji, data.sender_name);
            } else if (data.type === 'HOST_MUTED_ALL') {
              setIsMuted(true);
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
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
                cleanupPeerConnection(data.participant_id);
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
                // Initiate WebRTC call to newcomer
                initiateCallToPeer(newP.id);
              }
            } else if (data.type === 'SIGNAL') {
              const senderId = data.sender;
              const payload = data.payload;
              if (!senderId || !payload) return;

              if (payload.type === 'offer') {
                (async () => {
                  try {
                    const pc = createPeerConnection(senderId);
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

                    // Drain queued ICE candidates
                    const queued = iceCandidatesQueueRef.current.get(senderId) || [];
                    for (const cand of queued) {
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                      } catch (e) {
                        console.warn('Error applying queued ICE candidate:', e);
                      }
                    }
                    iceCandidatesQueueRef.current.delete(senderId);

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(
                        JSON.stringify({
                          type: 'SIGNAL',
                          target: senderId,
                          payload: {
                            type: 'answer',
                            sdp: answer
                          }
                        })
                      );
                    }
                  } catch (err) {
                    console.error('Error handling WebRTC offer:', err);
                  }
                })();
              } else if (payload.type === 'answer') {
                (async () => {
                  try {
                    const pc = peerConnectionsRef.current.get(senderId);
                    if (pc) {
                      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

                      // Drain queued ICE candidates
                      const queued = iceCandidatesQueueRef.current.get(senderId) || [];
                      for (const cand of queued) {
                        try {
                          await pc.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (e) {
                          console.warn('Error applying queued ICE candidate:', e);
                        }
                      }
                      iceCandidatesQueueRef.current.delete(senderId);
                    }
                  } catch (err) {
                    console.error('Error handling WebRTC answer:', err);
                  }
                })();
              } else if (payload.type === 'candidate') {
                (async () => {
                  try {
                    const pc = peerConnectionsRef.current.get(senderId);
                    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } else {
                      const currentQueue = iceCandidatesQueueRef.current.get(senderId) || [];
                      currentQueue.push(payload.candidate);
                      iceCandidatesQueueRef.current.set(senderId, currentQueue);
                    }
                  } catch (err) {
                    console.warn('Error adding ICE candidate:', err);
                  }
                })();
              } else if (payload.type === 'peer-ready') {
                initiateCallToPeer(senderId);
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
              cleanupPeerConnection(data.participant_id);
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
    },
    [isChatOpen, info, error, createPeerConnection, initiateCallToPeer, cleanupPeerConnection]
  );

  // Guarantee cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current.clear();
      iceCandidatesQueueRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

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
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
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

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
      });
    }

    if (!newVideoOff && (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack);
          } else {
            localStreamRef.current = stream;
          }
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

          // Update video track on all peer connections
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              try {
                pc.addTrack(newTrack, localStreamRef.current!);
              } catch (e) {
                console.warn('Track add failed:', e);
              }
            }
          });
        }
      } catch (err) {
        console.warn('Failed to start camera:', err);
        setIsVideoOff(true);
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

      // Revert peer connections back to camera video track
      const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && camTrack) {
          sender.replaceTrack(camTrack);
        }
      });

      success('Screen sharing stopped.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenShareStream(stream);
        setScreenShareBy(currentDisplayName);
        success('You are now sharing your screen.');

        const screenTrack = stream.getVideoTracks()[0];
        // Send screen video track to all connected peers
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          setScreenShareStream(null);
          setScreenShareBy(null);
          const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (sender && camTrack) {
              sender.replaceTrack(camTrack);
            }
          });
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
      if (isHost && roomParticipants.length <= 1) {
        await api.endMeeting(meeting.id).catch(() => {});
      } else {
        await api.leaveMeeting(meeting.id, selfParticipant.id).catch(() => {});
      }
    }
    success('You left the meeting.');
    cleanupAndLeave();
  };

  // Clean up streams, WebRTC connections, and return to dashboard
  const cleanupAndLeave = () => {
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();
    iceCandidatesQueueRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
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
