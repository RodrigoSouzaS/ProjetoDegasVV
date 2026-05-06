import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeckStore, type Deck, type Card } from '../../stores/deckStore';
import { api } from '../../services/api';
import { cardColor, COLOR_MAP } from '../../services/srs';
import { t } from '../../i18n';

type StudyMode = 'flip' | 'multiple_choice' | 'type';

const MODES: { key: StudyMode; icon: string; label: string; color: string }[] = [
  { key: 'flip', icon: 'swap-horizontal', label: 'Frente e Verso', color: '#3B82F6' },
  { key: 'multiple_choice', icon: 'list', label: 'Múltipla Escolha', color: '#8B5CF6' },
  { key: 'type', icon: 'create', label: 'Digite a Resposta', color: '#10B981' },
];

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCards } = useDeckStore();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Deck>(`/decks/${id}`),
      getCards(id),
    ]).then(([d, c]) => {
      setDeck(d);
      setCards(c);
    }).finally(() => setLoading(false));
  }, [id]);

  const startStudy = (mode: StudyMode) => {
    router.push({ pathname: `/study/${id}`, params: { mode } });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366F1" size="large" />
    </View>
  );

  if (!deck) return null;

  const newCount = cards.filter((c) => !c.status || c.status === 'new').length;
  const hardCount = cards.filter((c) => c.status === 'hard').length;
  const reviewCount = cards.filter((c) => c.status === 'review').length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#F9FAFB" />
          </Pressable>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          {deck.isOwner && (
            <Pressable onPress={() => Alert.alert('Em breve', 'Edição de deck')}>
              <Ionicons name="pencil" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* SRS stats */}
        <View style={styles.srsRow}>
          <View style={[styles.srsBadge, { backgroundColor: '#3B82F620' }]}>
            <Text style={[styles.srsCount, { color: '#3B82F6' }]}>{newCount}</Text>
            <Text style={styles.srsLabel}>Novas</Text>
          </View>
          <View style={[styles.srsBadge, { backgroundColor: '#EF444420' }]}>
            <Text style={[styles.srsCount, { color: '#EF4444' }]}>{hardCount}</Text>
            <Text style={styles.srsLabel}>Difíceis</Text>
          </View>
          <View style={[styles.srsBadge, { backgroundColor: '#22C55E20' }]}>
            <Text style={[styles.srsCount, { color: '#22C55E' }]}>{reviewCount}</Text>
            <Text style={styles.srsLabel}>Revisão</Text>
          </View>
        </View>

        {/* Study modes */}
        <Text style={styles.sectionTitle}>Modo de estudo</Text>
        <View style={styles.modesGrid}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.modeCard, { borderColor: m.color }]}
              onPress={() => startStudy(m.key)}
            >
              <Ionicons name={m.icon as any} size={24} color={m.color} />
              <Text style={[styles.modeLabel, { color: m.color }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Card list */}
        <Text style={styles.sectionTitle}>Cartas ({cards.length})</Text>
        {cards.map((card) => (
          <View key={card.id} style={styles.cardRow}>
            <View style={[styles.colorDot, { backgroundColor: COLOR_MAP[cardColor(card.status)] }]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardFront}>{card.front}</Text>
              <Text style={styles.cardBack}>{card.back}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  deckName: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F9FAFB' },
  srsRow: { flexDirection: 'row', gap: 12 },
  srsBadge: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  srsCount: { fontSize: 24, fontWeight: '800' },
  srsLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  modesGrid: { gap: 10 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1E1E2E', borderRadius: 16,
    padding: 18, borderWidth: 1,
  },
  modeLabel: { fontSize: 16, fontWeight: '700' },
  cardRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#1E1E2E', borderRadius: 12, padding: 14,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  cardContent: { flex: 1 },
  cardFront: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  cardBack: { fontSize: 13, color: '#9CA3AF', marginTop: 3 },
});
