import { create } from 'zustand';
import { api } from '../services/api';

export interface Deck {
  id: string;
  ownerId: string;
  ownerUsername: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  tags: string[];
  cardCount: number;
  studentCount: number;
  isOwner: boolean;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  position: number;
  status: 'new' | 'hard' | 'review' | null;
  nextReviewDate: string | null;
}

interface DeckState {
  decks: Deck[];
  loading: boolean;
  fetchDecks: () => Promise<void>;
  createDeck: (data: { name: string; description?: string; isPublic: boolean; tags?: string[] }) => Promise<Deck>;
  deleteDeck: (id: string) => Promise<void>;
  saveDeckToLibrary: (id: string) => Promise<void>;
  getCards: (deckId: string) => Promise<Card[]>;
  addCard: (deckId: string, front: string, back: string) => Promise<Card>;
  deleteCard: (deckId: string, cardId: string) => Promise<void>;
}

export const useDeckStore = create<DeckState>((set) => ({
  decks: [],
  loading: false,

  fetchDecks: async () => {
    set({ loading: true });
    const decks = await api.get<Deck[]>('/decks');
    set({ decks, loading: false });
  },

  createDeck: async (data) => {
    const deck = await api.post<Deck>('/decks', data);
    set((s) => ({ decks: [deck, ...s.decks] }));
    return deck;
  },

  deleteDeck: async (id) => {
    await api.delete(`/decks/${id}`);
    set((s) => ({ decks: s.decks.filter((d) => d.id !== id) }));
  },

  saveDeckToLibrary: async (id) => {
    await api.post(`/decks/${id}/save`);
  },

  getCards: async (deckId) => {
    return api.get<Card[]>(`/decks/${deckId}/cards`);
  },

  addCard: async (deckId, front, back) => {
    return api.post<Card>(`/decks/${deckId}/cards`, { front, back });
  },

  deleteCard: async (deckId, cardId) => {
    await api.delete(`/decks/${deckId}/cards/${cardId}`);
  },
}));
