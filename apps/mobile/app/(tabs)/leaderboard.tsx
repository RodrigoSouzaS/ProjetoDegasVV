import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LeaderboardRow from '../../components/LeaderboardRow';
import { t } from '../../i18n';

interface Player {
  id: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  position: number;
}

interface LeaderboardData {
  ranking: Player[];
  myPosition: number | null;
}

export default function LeaderboardScreen() {
  const { user } = useAuthStore();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[] | null>(null);

  useEffect(() => {
    api.get<LeaderboardData>('/leaderboard').then(setData);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setSearchResults(null); return; }
    const results = await api.get<Player[]>(`/leaderboard/search?q=${encodeURIComponent(q)}`);
    setSearchResults(results);
  };

  const displayed = searchResults ?? data?.ranking ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t('leaderboard.title')}</Text>

      {data?.myPosition && (
        <View style={styles.myRank}>
          <Ionicons name="trophy" size={16} color="#F59E0B" />
          <Text style={styles.myRankText}>
            {t('leaderboard.yourPosition', { position: data.myPosition })}
          </Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('leaderboard.searchPlayer')}
          placeholderTextColor="#6B7280"
          value={query}
          onChangeText={handleSearch}
        />
      </View>

      {!data ? (
        <ActivityIndicator color="#6366F1" style={styles.loader} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <LeaderboardRow
              position={item.position}
              username={item.username}
              avatarUrl={item.avatarUrl}
              xp={item.xp}
              level={item.level}
              isMe={item.id === user?.id}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { fontSize: 24, fontWeight: '800', color: '#F9FAFB', padding: 20, paddingBottom: 12 },
  myRank: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F59E0B20', marginHorizontal: 20,
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  myRankText: { color: '#F59E0B', fontWeight: '700', fontSize: 14 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1E1E2E', marginHorizontal: 20,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#2D2D3E',
  },
  searchInput: { flex: 1, color: '#F9FAFB', paddingVertical: 12, fontSize: 15 },
  loader: { marginTop: 40 },
});
