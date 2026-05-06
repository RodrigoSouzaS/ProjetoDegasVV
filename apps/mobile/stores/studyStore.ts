import { create } from 'zustand';
import { api } from '../services/api';
import type { Card } from './deckStore';

export type StudyMode = 'flip' | 'multiple_choice' | 'type';

interface StudySession {
  id: string;
  deckId: string;
  mode: StudyMode;
  xpEarned: number;
  cardsStudied: number;
}

interface StudyState {
  session: StudySession | null;
  queue: Card[];
  currentIndex: number;
  startSession: (deckId: string, mode: StudyMode) => Promise<void>;
  loadQueue: (deckId: string) => Promise<void>;
  answerCard: (cardId: string, quality: number, exactMatch?: boolean) => Promise<{ xpEarned: number }>;
  endSession: () => Promise<void>;
  nextCard: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  session: null,
  queue: [],
  currentIndex: 0,

  loadQueue: async (deckId) => {
    const cards = await api.get<Card[]>(`/study/due/${deckId}`);
    set({ queue: cards, currentIndex: 0 });
  },

  startSession: async (deckId, mode) => {
    const session = await api.post<{ id: string }>('/study/session', { deckId, mode });
    set({ session: { id: session.id, deckId, mode, xpEarned: 0, cardsStudied: 0 } });
  },

  answerCard: async (cardId, quality, exactMatch) => {
    const { session } = get();
    if (!session) throw new Error('No active session');

    const result = await api.post<{ xpEarned: number }>('/study/answer', {
      cardId,
      quality,
      mode: session.mode,
      exactMatch,
    });

    set((s) => ({
      session: s.session
        ? {
            ...s.session,
            xpEarned: s.session.xpEarned + result.xpEarned,
            cardsStudied: s.session.cardsStudied + 1,
          }
        : null,
    }));

    return result;
  },

  endSession: async () => {
    const { session } = get();
    if (!session) return;

    await api.patch(`/study/session/${session.id}/end`, {
      cardsStudied: session.cardsStudied,
      xpEarned: session.xpEarned,
    });
    set({ session: null, queue: [], currentIndex: 0 });
  },

  nextCard: () => {
    set((s) => ({ currentIndex: s.currentIndex + 1 }));
  },
}));
