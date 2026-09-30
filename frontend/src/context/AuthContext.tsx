'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserLoginInput, UserRegisterInput } from '../types';
import { api } from '../lib/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: UserLoginInput) => Promise<void>;
  register: (data: UserRegisterInput) => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const { success, error, info } = useToast();

  // Load existing session on client mount
  useEffect(() => {
    async function loadSession() {
      try {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('zoom_auth_token');
          if (storedToken) {
            setToken(storedToken);
            try {
              const profile = await api.getMe();
              setUser(profile);
              localStorage.setItem('zoom_user_name', profile.full_name);
              sessionStorage.setItem('zoom_display_name', profile.full_name);
            } catch {
              // Token expired or invalid
              localStorage.removeItem('zoom_auth_token');
              localStorage.removeItem('zoom_auth_user');
              setToken(null);
              setUser(null);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = useCallback(
    async (data: UserLoginInput) => {
      try {
        const res = await api.login(data);
        setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('zoom_auth_token', res.token);
          localStorage.setItem('zoom_auth_user', JSON.stringify(res.user));
          localStorage.setItem('zoom_user_name', res.user.full_name);
          sessionStorage.setItem('zoom_display_name', res.user.full_name);
        }
        setIsAuthModalOpen(false);
        success(`Welcome back, ${res.user.full_name}!`);
      } catch (err: unknown) {
        const msg = (err as Error).message || 'Failed to sign in.';
        error(msg);
        throw err;
      }
    },
    [success, error]
  );

  const register = useCallback(
    async (data: UserRegisterInput) => {
      try {
        const res = await api.register(data);
        setToken(res.token);
        setUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('zoom_auth_token', res.token);
          localStorage.setItem('zoom_auth_user', JSON.stringify(res.user));
          localStorage.setItem('zoom_user_name', res.user.full_name);
          sessionStorage.setItem('zoom_display_name', res.user.full_name);
        }
        setIsAuthModalOpen(false);
        success(`Account created! Welcome to Zoom, ${res.user.full_name}.`);
      } catch (err: unknown) {
        const msg = (err as Error).message || 'Failed to create account.';
        error(msg);
        throw err;
      }
    },
    [success, error]
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zoom_auth_token');
      localStorage.removeItem('zoom_auth_user');
    }
    setToken(null);
    setUser(null);
    info('You have logged out.');
  }, [info]);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
