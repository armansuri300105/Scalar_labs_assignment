'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Users,
  MessageSquare,
  ArrowUpFromLine,
  Smile,
  Disc,
  PhoneOff,
  ChevronUp,
  Hand,
  Settings
} from 'lucide-react';

interface MeetingControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  isRecording?: boolean;
  isHost: boolean;
  allowShareScreen?: boolean;
  allowUnmute?: boolean;
  participantCount: number;
  unreadChatCount: number;
  isParticipantsOpen: boolean;
  isChatOpen: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleHand: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onOpenSecurity: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll: () => void;
}

export function MeetingControls({
  isMuted,
  isVideoOff,
  isHandRaised,
  isScreenSharing,
  isRecording = false,
  isHost,
  allowShareScreen = true,
  allowUnmute = true,
  participantCount,
  unreadChatCount,
  isParticipantsOpen,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onToggleHand,
  onToggleScreenShare,
  onToggleRecording,
  onToggleParticipants,
  onToggleChat,
  onOpenSecurity,
  onSendReaction,
  onLeaveMeeting,
  onEndMeetingForAll
}: MeetingControlsProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const emojiList = ['👏', '👍', '❤️', '😂', '😮', '🎉'];

  return (
    <>
      <footer className="h-18 bg-[#181A20] border-t border-white/10 px-4 sm:px-6 flex items-center justify-between text-white shrink-0 z-30 select-none">
        {/* Left: Audio & Video controls with popovers */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mute/Unmute */}
          <div className="flex items-center">
            <button
              onClick={onToggleMute}
              className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-all cursor-pointer ${
                isMuted
                  ? 'text-rose-400 hover:bg-white/10'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-slate-100" />}
              <span className="text-[10px] mt-1 font-medium">
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>
          </div>

          {/* Video Start/Stop */}
          <div className="flex items-center">
            <button
              onClick={onToggleVideo}
              className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-all cursor-pointer ${
                isVideoOff
                  ? 'text-rose-400 hover:bg-white/10'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-slate-100" />}
              <span className="text-[10px] mt-1 font-medium">
                {isVideoOff ? 'Start Video' : 'Stop Video'}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Main Meeting Tool Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Security (Host Only) */}
          {isHost && (
            <button
              onClick={onOpenSecurity}
              className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              title="Meeting Security Options (Host Only)"
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] mt-1 font-medium text-emerald-400">Security</span>
            </button>
          )}

          {/* Participants */}
          <button
            onClick={onToggleParticipants}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-colors relative cursor-pointer ${
              isParticipantsOpen ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Participants</span>
            <span className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-xs">
              {participantCount}
            </span>
          </button>

          {/* Chat */}
          <button
            onClick={onToggleChat}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-colors relative cursor-pointer ${
              isChatOpen ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Chat</span>
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Share Screen (Zoom iconic Green button) */}
          <button
            onClick={onToggleScreenShare}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-colors cursor-pointer ${
              !isHost && !allowShareScreen
                ? 'opacity-40 text-slate-500 hover:bg-transparent cursor-not-allowed'
                : isScreenSharing
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-emerald-400 hover:bg-white/10'
            }`}
            title={!isHost && !allowShareScreen ? 'Screen sharing has been disabled by the host' : isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <ArrowUpFromLine className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium text-emerald-400">
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </span>
          </button>

          {/* Record */}
          <button
            onClick={onToggleRecording}
            className={`flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl transition-colors cursor-pointer hidden md:flex ${
              isRecording ? 'text-rose-400' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Disc className={`w-5 h-5 ${isRecording ? 'animate-pulse text-rose-500' : ''}`} />
            <span className="text-[10px] mt-1 font-medium">
              {isRecording ? 'Recording' : 'Record'}
            </span>
          </button>

          {/* Reactions (with popover) */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-xl text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Smile className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">Reactions</span>
            </button>

            {/* Reactions Popover */}
            {showReactions && (
              <div
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#24272C] rounded-2xl shadow-2xl border border-white/15 p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Emojis row */}
                <div className="flex items-center gap-2">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onSendReaction(emoji);
                        setShowReactions(false);
                      }}
                      className="text-2xl p-2 hover:scale-125 transition-transform hover:bg-white/10 rounded-xl cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-2">
                  <button
                    onClick={() => {
                      onToggleHand();
                      setShowReactions(false);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      isHandRaised
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <Hand className="w-4 h-4 fill-current" />
                    <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: End / Leave Button (Zoom iconic red button) */}
        <div className="flex items-center">
          <button
            onClick={() => setShowEndDialog(true)}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            {isHost ? 'End' : 'Leave'}
          </button>
        </div>
      </footer>

      {/* End / Leave Confirmation Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-sm bg-[#24272C] rounded-2xl shadow-2xl border border-white/15 p-6 text-white text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold">
                {isHost ? 'End or Leave Meeting?' : 'Leave Meeting?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isHost
                  ? 'As host, you can end this meeting for everyone or leave someone else in charge.'
                  : 'Are you sure you want to leave this meeting room?'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {isHost && (
                <button
                  onClick={() => {
                    setShowEndDialog(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  End Meeting for All
                </button>
              )}

              <button
                onClick={() => {
                  setShowEndDialog(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Leave Meeting
              </button>

              <button
                onClick={() => setShowEndDialog(false)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
