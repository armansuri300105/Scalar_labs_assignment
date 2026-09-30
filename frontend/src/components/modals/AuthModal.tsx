'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, Loader2, Video, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal, login, register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password.');
      return;
    }

    if (!isLogin && !fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isLogin) {
        await login({ email: email.trim(), password });
      } else {
        await register({ email: email.trim(), password, full_name: fullName.trim() });
      }
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Demo Account for Instant Testing
  const handleQuickDemo = async () => {
    setFormError(null);
    setIsSubmitting(true);
    const demoEmail = 'host@scaler.com';
    const demoPassword = 'password123';
    try {
      await login({ email: demoEmail, password: demoPassword });
    } catch {
      // If demo account doesn't exist yet, auto-register it
      try {
        await register({ email: demoEmail, password: demoPassword, full_name: 'Demo Host' });
      } catch (regErr: unknown) {
        setFormError((regErr as Error).message || 'Demo login failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1E2024] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E71EB] flex items-center justify-center text-white shadow-xs">
              <Video className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {isLogin ? 'Sign In to Zoom' : 'Create Zoom Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isLogin ? 'Enter your credentials to host and manage meetings' : 'Start hosting secure meetings with full privileges'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              openAuthModal('login');
              setFormError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              isLogin
                ? 'border-[#0E71EB] text-[#0E71EB] dark:text-[#2D8CFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('register');
              setFormError(null);
            }}
            className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              !isLogin
                ? 'border-[#0E71EB] text-[#0E71EB] dark:text-[#2D8CFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span className="font-semibold">Error:</span>
              <span>{formError}</span>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#16181D] border border-slate-200 dark:border-slate-700 focus-within:border-[#0E71EB] dark:focus-within:border-blue-500">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#16181D] border border-slate-200 dark:border-slate-700 focus-within:border-[#0E71EB] dark:focus-within:border-blue-500">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#16181D] border border-slate-200 dark:border-slate-700 focus-within:border-[#0E71EB] dark:focus-within:border-blue-500">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="password"
                placeholder="•••••••• (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0E71EB] hover:bg-[#0B5ED7] disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={isSubmitting}
              className="text-xs text-[#0E71EB] dark:text-[#2D8CFF] hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sign in with 1-Click Demo Account (host@scaler.com)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
