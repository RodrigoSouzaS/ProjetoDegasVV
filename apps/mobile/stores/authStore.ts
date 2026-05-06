import { create } from 'zustand';
import { supabase, api } from '../services/api';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streakDays: number;
  lastStudyDate: string | null;
  role: 'student' | 'teacher';
}

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  setSession: async (session) => {
    set({ session });
    if (session) {
      try {
        const user = await api.get<AppUser>('/users/me');
        set({ user, loading: false });
      } catch {
        set({ loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  refreshUser: async () => {
    const user = await api.get<AppUser>('/users/me');
    set({ user });
  },
}));
