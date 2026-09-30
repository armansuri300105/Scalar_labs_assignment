'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Smile, Paperclip, Lock } from 'lucide-react';
import { ChatMessage } from '../../types';
import { formatTime } from '../../lib/utils';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserName: string;
  isHost?: boolean;
  allowChat?: boolean;
  onSendMessage: (text: string) => void;
}

export function ChatPanel({
  isOpen,
  onClose,
  messages,
  currentUserName,
  isHost = false,
  allowChat = true,
  onSendMessage
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Guarantee deduplication by message ID
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((msg) => {
      if (!msg.id) return true;
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uniqueMessages, isOpen]);

  if (!isOpen) return null;

  const isChatRestricted = !isHost && !allowChat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChatRestricted) return;
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 sm:static sm:w-88 bg-[#1E2024] border-l border-white/10 flex flex-col h-full z-40 sm:z-20 shrink-0 text-white select-none shadow-2xl">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Recipient info bar */}
      <div className="px-4 py-2 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
        <span className="text-slate-400">To:</span>
        <span className="font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
          Everyone
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {uniqueMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 space-y-1">
            <p>No messages yet in this meeting.</p>
            <p>Send a message to say hello to everyone!</p>
          </div>
        ) : (
          uniqueMessages.map((msg) => {
            const isSelf = msg.sender_name === currentUserName;
            return (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isSelf ? 'text-blue-400' : 'text-slate-200'}`}>
                    {msg.sender_name} {isSelf && '(Me)'}
                  </span>
                  {msg.sender_role === 'host' && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded">
                      Host
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {formatTime(msg.sent_at)}
                  </span>
                </div>
                <div className="text-xs text-slate-200 bg-black/40 p-2.5 rounded-xl border border-white/5 break-words">
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Restricted Chat Notice */}
      {isChatRestricted && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>In-meeting chat has been disabled by the host.</span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-[#181A20]">
        <div className={`flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 ${isChatRestricted ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-[#0E71EB]'}`}>
          <input
            type="text"
            disabled={isChatRestricted}
            placeholder={isChatRestricted ? "Chat disabled by host" : "Type message to everyone..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isChatRestricted || !inputText.trim()}
            className="p-1.5 rounded-lg bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
