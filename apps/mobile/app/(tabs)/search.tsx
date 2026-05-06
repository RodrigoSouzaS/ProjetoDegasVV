import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useDeckStore, type Deck } from '../../stores/deckStore';
import { t } from '../../i18n';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);
  const { saveDeckToLibrary } = useDeckStore();

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await api.get<Deck[]>(`/search/decks?q=${encodeURIComponent(q)}`);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async (deckId: string) => {
    try {
      await saveDeckToLibrary(deckId);
      Alert.alert(t('common.success'), 'Deck adicionado à sua biblioteca!');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t('search.title')}</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder={t('search.placeholder')}
          placeholderTextColor="#6B7280"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <View style={styles.resultInfo}>
                <Text style={styles.deckName}>{item.name}</Text>
                <Text style={styles.deckMeta}>
                  {t('search.by', { author: item.ownerUsername })} · {item.cardCount} cartas
                </Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => handleSave(item.id)}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.empty}>Nenhum resultado para "{query}"</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#F9FAFB', marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  input: { flex: 1, color: '#F9FAFB', fontSize: 15, paddingVertical: 14 },
  loader: { marginTop: 40 },
  list: { gap: 12 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  resultInfo: { flex: 1 },
  deckName: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  deckMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 3 },
  addBtn: { backgroundColor: '#6366F1', borderRadius: 10, padding: 8 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
});
